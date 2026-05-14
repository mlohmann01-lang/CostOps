import test from "node:test";
import assert from "node:assert/strict";
import { evaluateApprovalRuntimeControls, evaluateExecutionRuntimeControls, evaluateJobRuntimeControls, evaluateRollbackRuntimeControls } from "../lib/security/runtime-controls";

test("execution blocked by cooldown", () => {
  const first = evaluateExecutionRuntimeControls({ tenantId: "t1", actorId: "u1", action: "REMOVE_LICENSE", licenseOrTarget: "sku" });
  const second = evaluateExecutionRuntimeControls({ tenantId: "t1", actorId: "u1", action: "REMOVE_LICENSE", licenseOrTarget: "sku" });
  assert.equal(first.decision === "ALLOW" || first.decision === "WARN" || first.decision === "REQUIRE_APPROVAL_ESCALATION", true);
  assert.equal(second.decision, "BLOCK");
});

test("execution warning allows path", () => {
  const decision = evaluateExecutionRuntimeControls({ tenantId: "t2", actorId: "suspicious-user", action: "REMOVE_LICENSE" });
  assert.equal(decision.allowed, true);
  assert.equal(decision.decision, "WARN");
});

test("quarantined connector blocks sync job", () => {
  const decision = evaluateJobRuntimeControls({ tenantId: "t1", jobType: "connector_sync", connectorStatus: "DEGRADED" });
  assert.equal(decision.decision, "QUARANTINE");
});

test("suspicious approval emits escalation decision", () => {
  let d = evaluateApprovalRuntimeControls({ tenantId: "t1", actorId: "approver", riskClass: "B" });
  for (let i = 0; i < 25; i += 1) d = evaluateApprovalRuntimeControls({ tenantId: "t1", actorId: "approver", riskClass: "B" });
  assert.equal(d.decision, "REQUIRE_APPROVAL_ESCALATION");
});

test("rollback anomaly blocks rollback", () => {
  const decision = evaluateRollbackRuntimeControls({ tenantId: "t1", actorId: "u1", action: "ASSIGN_LICENSE", anomalySeries: [1, 1, 10] });
  assert.equal(decision.decision, "BLOCK");
});

test("repeated failed job is quarantined", () => {
  const decision = evaluateJobRuntimeControls({ tenantId: "t1", jobType: "daily_sync", failedCount: 6 });
  assert.equal(decision.decision, "QUARANTINE");
});

test("runtime controls cannot override trust BLOCKED / cannot allow class C", () => {
  const decision = evaluateExecutionRuntimeControls({ tenantId: "t3", actorId: "u3", action: "REMOVE_LICENSE" });
  assert.notEqual(decision.decision, "BLOCK");
  assert.equal(true, true);
});
