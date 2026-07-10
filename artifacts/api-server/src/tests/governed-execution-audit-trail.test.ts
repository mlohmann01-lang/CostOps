import test from "node:test";
import assert from "node:assert/strict";
import { db, auditEventsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import governedExecutionRouter from "../routes/governed-execution";
import { GovernedExecutionService } from "../lib/governed-execution";

// DB integration test: proves the approve/execute/cancel routes actually write to
// the audit trail (audit-service.ts's recordAuditEvent), not just that a guard
// middleware is attached. Skipped automatically unless RUN_DB_INTEGRATION_TESTS=true.

const tenantId = `tenant-audit-trail-${Date.now()}`;

function findRoute(path: string, method: "post") {
  const layer = (governedExecutionRouter as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  );
  if (!layer) throw new Error(`route not found: ${method.toUpperCase()} ${path}`);
  return layer.route;
}

async function invokeRoute(route: any, req: any) {
  let status = 200;
  let body: any;
  let error: any;
  const res: any = {
    json: (b: any) => { body = b; },
    status: (c: number) => { status = c; return { json: (b: any) => { body = b; } }; },
  };
  for (const layer of route.stack) {
    let calledNext = false;
    let nextErr: any;
    const next = (err?: any) => { calledNext = true; nextErr = err; };
    await layer.handle(req, res, next);
    if (nextErr) { error = nextErr; break; }
    if (!calledNext) break;
  }
  return { status, body, error };
}

function mockReq(planId: string) {
  return {
    __authContext: { tenantId, userId: "approver-1", role: "APPROVER", authenticated: true, platformAdminOverride: false },
    tenantId,
    params: { id: planId },
    body: {},
    header: () => undefined,
  } as any;
}

async function latestAuditEvent(planId: string, eventType: string) {
  const rows = await db
    .select()
    .from(auditEventsTable)
    .where(and(eq(auditEventsTable.tenantId, tenantId), eq(auditEventsTable.resourceId, planId), eq(auditEventsTable.eventType, eventType)));
  return rows[0];
}

test("approve/execute/cancel on a governed execution plan each write a real audit event", async () => {
  const svc = new GovernedExecutionService();
  const plan = await svc.createExecutionPlan({ tenantId, title: "Audit trail test plan", targetId: "asset-1", actionType: "OWNER_ASSIGN" });

  const approveRoute = findRoute("/plans/:id/approve", "post");
  const approveResult = await invokeRoute(approveRoute, mockReq(plan.id));
  assert.equal(approveResult.error, undefined);
  const approvalEvent = await latestAuditEvent(plan.id, "APPROVAL_GRANTED");
  assert.ok(approvalEvent, "expected an APPROVAL_GRANTED audit event to be written");
  assert.equal(approvalEvent!.outcome, "SUCCESS");
  assert.equal(approvalEvent!.actorId, "approver-1");
  assert.equal(approvalEvent!.actorRole, "APPROVER");

  const executeRoute = findRoute("/plans/:id/execute", "post");
  const executeResult = await invokeRoute(executeRoute, mockReq(plan.id));
  assert.equal(executeResult.error, undefined);
  const executionEvent = (await latestAuditEvent(plan.id, "EXECUTION_COMPLETED")) ?? (await latestAuditEvent(plan.id, "EXECUTION_FAILED"));
  assert.ok(executionEvent, "expected an execution audit event to be written");

  const cancelRoute = findRoute("/plans/:id/cancel", "post");
  const cancelResult = await invokeRoute(cancelRoute, mockReq(plan.id));
  assert.equal(cancelResult.error, undefined);
  const cancelEvent = await latestAuditEvent(plan.id, "EXECUTION_CANCELLED");
  assert.ok(cancelEvent, "expected an EXECUTION_CANCELLED audit event to be written");
  assert.equal(cancelEvent!.outcome, "SUCCESS");
});

test("a rejected (VIEWER) approve attempt never reaches the handler, so no audit event is written for it", async () => {
  const svc = new GovernedExecutionService();
  const plan = await svc.createExecutionPlan({ tenantId, title: "Viewer-blocked plan", targetId: "asset-2", actionType: "OWNER_ASSIGN" });
  const approveRoute = findRoute("/plans/:id/approve", "post");
  const req = mockReq(plan.id);
  req.__authContext.role = "VIEWER";
  const result = await invokeRoute(approveRoute, req);
  assert.equal(result.status, 403);
  const approvalEvent = await latestAuditEvent(plan.id, "APPROVAL_GRANTED");
  assert.equal(approvalEvent, undefined);
});
