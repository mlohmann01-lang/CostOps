import test from "node:test";
import assert from "node:assert/strict";
import { db, auditEventsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { auditMiddleware } from "../middleware/audit-middleware";

// DB integration test: proves a cross-tenant PLATFORM_ADMIN operation is audited
// under the target tenant (the scope actually affected), while still recording
// which tenant the acting admin belongs to — so a cross-tenant admin action is
// traceable both by "what was affected" and "who did it". Skipped automatically
// unless RUN_DB_INTEGRATION_TESTS=true.

function fakeReq(requestId: string, targetTenantId: string, authTenantId: string) {
  return {
    method: "POST",
    path: "/api/ai-capital-allocation/allocations",
    params: {},
    headers: { "user-agent": "test-agent" },
    ip: "127.0.0.1",
    socket: {},
    id: requestId,
    tenantId: targetTenantId,
    __authContext: { tenantId: authTenantId, userId: "admin-1", role: "PLATFORM_ADMIN", authenticated: true },
  } as any;
}

function invoke(mw: any, req: any, statusCode = 200) {
  return new Promise<void>((resolve) => {
    const res: any = { statusCode, end: (..._args: any[]) => { resolve(); } };
    mw(req, res, () => {});
    res.end();
  });
}

// recordAuditEvent() is intentionally fire-and-forget (see audit-middleware.ts) — the
// response returns before the write lands, so tests must poll for the row rather than
// assume it exists immediately after res.end() resolves.
async function waitForAuditEvent(tenantId: string, requestId: string, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await db.select().from(auditEventsTable).where(and(eq(auditEventsTable.tenantId, tenantId), eq(auditEventsTable.requestId, requestId)));
    if (rows.length) return rows;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return [];
}

test("a cross-tenant PLATFORM_ADMIN operation is audited under the target tenant, with the actor's own tenant recorded in the payload", async () => {
  const requestId = `xt-${Date.now()}`;
  const req = fakeReq(requestId, "customer-42", "platform-hq");
  await invoke(auditMiddleware(), req);

  const rows = await waitForAuditEvent("customer-42", requestId);
  assert.equal(rows.length, 1, "expected exactly one audit event under the target tenant");
  const [row] = rows;
  assert.equal(row.tenantId, "customer-42");
  assert.equal(row.actorId, "admin-1");
  const payload = row.payload as Record<string, unknown>;
  assert.equal(payload.actorTenantId, "platform-hq");
  assert.equal(payload.crossTenantOperation, true);
});

test("a same-tenant operation is audited with no actorTenantId/crossTenantOperation markers (nothing to disambiguate)", async () => {
  const requestId = `st-${Date.now()}`;
  const req = fakeReq(requestId, "tenant-a", "tenant-a");
  await invoke(auditMiddleware(), req);

  const rows = await waitForAuditEvent("tenant-a", requestId);
  assert.equal(rows.length, 1);
  const payload = rows[0].payload as Record<string, unknown>;
  assert.equal(payload.actorTenantId, undefined);
  assert.equal(payload.crossTenantOperation, undefined);
});
