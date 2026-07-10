import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionApprovalService } from "../lib/governance/execution-approval-service";

// DB integration test: proves the tamper-hash-on-expiry fix in
// execution-approval-service.ts, and that hash verification is stable across
// time / doesn't rewrite terminal decisions. Skipped automatically unless
// RUN_DB_INTEGRATION_TESTS=true.

const svc = new ExecutionApprovalService();
const tenantId = `tenant-tamper-expiry-${Date.now()}`;

function baseInput(entityId: string, requiredApprovals = 1) {
  return { tenantId, entityType: "execution_plan", entityId, approvalType: "STANDARD", requiredApprovals, requestedBy: "u1" };
}

test("hash verifies immediately after creation", async () => {
  const r = await svc.requestApproval(baseInput("plan-1"));
  assert.equal(svc.verifyTamperHash(r), true);
});

test("hash still verifies after an approval is legitimately expired (the hash is recomputed for the new state, not left stale)", async () => {
  const r = await svc.requestApproval(baseInput("plan-2"));
  const expired = await svc.expire(r.id);
  assert.ok(expired, "expire() should update a PENDING approval");
  assert.equal(expired!.approvalStatus, "EXPIRED");
  assert.equal(svc.verifyTamperHash(expired!), true);
});

test("modifying a hashed field out-of-band causes verification to fail", async () => {
  const r = await svc.requestApproval(baseInput("plan-3"));
  const tampered = { ...r, requiredApprovals: 99 };
  assert.equal(svc.verifyTamperHash(tampered), false);
});

test("expiring an already-terminal (APPROVED) approval is a no-op and never rewrites the original decision or its hash", async () => {
  const r = await svc.requestApproval(baseInput("plan-4"));
  const approved = await svc.approve(r.id, "approver-1");
  assert.equal(approved.approvalStatus, "APPROVED");
  const approvedHash = approved.tamperHash;

  const expireResult = await svc.expire(r.id); // guarded by WHERE approvalStatus='PENDING'
  assert.equal(expireResult, undefined, "expire() must not affect a non-PENDING row");

  const status = await svc.getApprovalStatus(r.id);
  assert.equal(status!.approvalStatus, "APPROVED");
  assert.equal(status!.tamperHash, approvedHash);
  assert.equal(svc.verifyTamperHash(status!), true);
});

test("hash verification does not depend on volatile/time-based values (createdAt/updatedAt are not part of the hashed field set)", async () => {
  const r = await svc.requestApproval(baseInput("plan-5"));
  const farFuture = { ...r, createdAt: new Date(Date.now() + 365 * 86_400_000), updatedAt: new Date(Date.now() + 365 * 86_400_000) };
  assert.equal(svc.verifyTamperHash(farFuture), true, "recomputing days/years later must still match, since time fields aren't hashed");
});

test("each transition (request -> approve, and separately request -> expire) produces a different hash than the previous state", async () => {
  const requested = await svc.requestApproval(baseInput("plan-6"));
  const approved = await svc.approve(requested.id, "approver-1");
  assert.notEqual(approved.tamperHash, requested.tamperHash);

  const requested2 = await svc.requestApproval(baseInput("plan-7"));
  const expired = await svc.expire(requested2.id);
  assert.notEqual(expired!.tamperHash, requested2.tamperHash);
});
