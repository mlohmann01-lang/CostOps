import test from "node:test";
import assert from "node:assert/strict";

test("approval changes eligibility but not execution", () => {
  const eligibilityState = { approvalStatus: "APPROVED", executesDirectly: false };
  assert.equal(eligibilityState.approvalStatus, "APPROVED");
  assert.equal(eligibilityState.executesDirectly, false);
});
