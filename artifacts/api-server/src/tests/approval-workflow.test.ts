import test from "node:test";
import assert from "node:assert/strict";
import { db, approvalEventsTable, approvalRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { approveRequest, createApprovalRequest, getApprovalStatus, rejectRequest } from "../lib/governance/approval-workflow";
import { runExecutionEngine } from "../lib/execution/execution-engine";

test("approval workflow enforcement", async () => {
  const rec = { id: 999001, executionStatus: "APPROVAL_REQUIRED", criticalBlockers: [], entityTrustScore: 1, recommendationTrustScore: 1, executionReadinessScore: 1, actionRiskProfile: { riskClass: "B" }, userEmail: "user@contoso.com", licenceSku: "E5" };
  const noApproval = await runExecutionEngine({ recommendation: rec, actorId: "approver@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(noApproval.allowed, false);

  const request = await createApprovalRequest({ tenantId: "default", recommendationId: String(rec.id), requestedBy: "admin@contoso.com", reason: "needs approval", riskClass: "B" });
  assert.equal(request.status, "PENDING");

  await assert.rejects(() => approveRequest({ approvalRequestId: request.id, actorId: "viewer@contoso.com" }), /AUTH_INSUFFICIENT_ROLE/);
  await assert.rejects(() => approveRequest({ approvalRequestId: request.id, actorId: "admin@contoso.com" }), /SELF_APPROVAL_BLOCKED/);

  const approved = await approveRequest({ approvalRequestId: request.id, actorId: "approver@contoso.com", reason: "ok" });
  assert.equal(approved.status, "APPROVED");

  const allowed = await runExecutionEngine({ recommendation: rec, actorId: "approver@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(allowed.allowed, true);

  const request2 = await createApprovalRequest({ tenantId: "default", recommendationId: "999002", requestedBy: "admin@contoso.com", reason: "reject test", riskClass: "B" });
  await rejectRequest({ approvalRequestId: request2.id, actorId: "approver@contoso.com", reason: "no" });
  const rejected = await runExecutionEngine({ recommendation: { ...rec, id: 999002 }, actorId: "approver@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(rejected.allowed, false);

  const [expiredReq] = await db.insert(approvalRequestsTable).values({ tenantId: "default", recommendationId: "999003", requestedBy: "admin@contoso.com", requiredApproverRole: "APPROVER", status: "PENDING", riskClass: "B", action: "REMOVE_LICENSE", reason: "expired", expiresAt: new Date(Date.now()-1000), updatedAt: new Date() }).returning();
  const exp = await getApprovalStatus("999003");
  assert.equal(exp?.status, "EXPIRED");
  const blockedExpired = await runExecutionEngine({ recommendation: { ...rec, id: 999003 }, actorId: "approver@contoso.com", tenantId: "default", mode: "APPROVAL_EXECUTE", mvpMode: true });
  assert.equal(blockedExpired.allowed, false);

  const events = await db.select().from(approvalEventsTable).where(eq(approvalEventsTable.approvalRequestId, request.id));
  assert.ok(events.length >= 2);
});
