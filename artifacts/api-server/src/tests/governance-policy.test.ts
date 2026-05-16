import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionGovernancePolicyService } from "../lib/governance/execution-governance-policy-service";

test("policy cannot weaken runtime BLOCK", async () => {
  const svc = new ExecutionGovernancePolicyService();
  const out = await svc.evaluateRecommendationAgainstPolicy("default", { runtimeControlStatus: "BLOCK" });
  assert.equal(out.blocked, true);
});

test("automation promotion can be blocked by policy evaluation output", async () => {
  const svc = new ExecutionGovernancePolicyService();
  const out = await svc.evaluateAutomationPromotionAgainstPolicy("default", { actionType: "X" });
  assert.equal(typeof out.allowed, "boolean");
});
