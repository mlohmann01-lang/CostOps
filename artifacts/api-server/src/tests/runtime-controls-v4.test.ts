import test from "node:test";
import assert from "node:assert/strict";
import { evaluateExecutionRuntimeControls, evaluateApprovalRuntimeControls } from "../lib/security/runtime-controls";

test("execution cooldown window", () => {
  const baseInput = { tenantId: "tenant", actorId: "actor", action: "REMOVE_LICENSE", cooldownMs: 1_000 };
  const first = evaluateExecutionRuntimeControls(baseInput);
  assert.equal(first.decision, "ALLOW");
  const second = evaluateExecutionRuntimeControls(baseInput);
  assert.equal(second.decision, "BLOCK");
  assert.deepEqual(second.reasons, ["EXECUTION_COOLDOWN_ACTIVE"]);
});

test("suspicious approval detection", () => {
  let decision = evaluateApprovalRuntimeControls({ tenantId: "tenant", actorId: "actor", riskClass: "B", action: "REMOVE_LICENSE" });
  for (let i = 0; i < 10; i += 1) {
    decision = evaluateApprovalRuntimeControls({ tenantId: "tenant", actorId: "actor", riskClass: "B", action: "REMOVE_LICENSE" });
  }
  assert.equal(decision.decision, "REQUIRE_APPROVAL_ESCALATION");
  assert.equal(decision.reasons.includes("SUSPICIOUS_APPROVAL_DETECTED"), true);
});
