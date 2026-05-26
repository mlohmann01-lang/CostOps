import test from "node:test";
import assert from "node:assert/strict";
import { simulateExecutionRequest } from "../lib/execution/dry-run-simulator";

test("valid request produces READY_FOR_EXECUTION simulation", () => {
  const out = simulateExecutionRequest({ simulationId: "s1", executionRequestId: "er1", actionType: "REMOVE_LICENSE", executionState: "REQUESTED", expiresAt: new Date(Date.now()+60_000), recommendationState: "EXECUTION_READY", lifecycleState: "TRUSTED", evidencePointers: ["ev1"], approvalEventIds: ["a1"], projectedMonthlySavings: 10, targetEntityId: "u1" });
  assert.equal(out.simulationState, "READY_FOR_EXECUTION");
});

test("missing approval blocks simulation", () => {
  const out = simulateExecutionRequest({ simulationId: "s1", executionRequestId: "er1", actionType: "REMOVE_LICENSE", executionState: "REQUESTED", expiresAt: new Date(Date.now()+60_000), recommendationState: "EXECUTION_READY", lifecycleState: "TRUSTED", evidencePointers: ["ev1"], approvalEventIds: [], projectedMonthlySavings: 10, targetEntityId: "u1" });
  assert.equal(out.simulationState, "BLOCKED");
});

test("expired request blocks simulation", () => {
  const out = simulateExecutionRequest({ simulationId: "s1", executionRequestId: "er1", actionType: "REMOVE_LICENSE", executionState: "REQUESTED", expiresAt: new Date(Date.now()-60_000), recommendationState: "EXECUTION_READY", lifecycleState: "TRUSTED", evidencePointers: ["ev1"], approvalEventIds: ["a1"], projectedMonthlySavings: 10, targetEntityId: "u1" });
  assert.equal(out.simulationState, "BLOCKED");
});

test("cancelled request blocks simulation", () => {
  const out = simulateExecutionRequest({ simulationId: "s1", executionRequestId: "er1", actionType: "REMOVE_LICENSE", executionState: "CANCELLED", expiresAt: new Date(Date.now()+60_000), recommendationState: "EXECUTION_READY", lifecycleState: "TRUSTED", evidencePointers: ["ev1"], approvalEventIds: ["a1"], projectedMonthlySavings: 10, targetEntityId: "u1" });
  assert.equal(out.simulationState, "BLOCKED");
});

test("rollback plan generated for REMOVE_LICENSE", () => {
  const out = simulateExecutionRequest({ simulationId: "s1", executionRequestId: "er1", actionType: "REMOVE_LICENSE", executionState: "REQUESTED", expiresAt: new Date(Date.now()+60_000), recommendationState: "EXECUTION_READY", lifecycleState: "TRUSTED", evidencePointers: ["ev1"], approvalEventIds: ["a1"], projectedMonthlySavings: 10, targetEntityId: "u1" });
  assert.equal(out.rollbackSupported, true);
});

test("policy block produces BLOCKED state", () => {
  const out = simulateExecutionRequest({ simulationId: "s1", executionRequestId: "er1", actionType: "REMOVE_LICENSE", executionState: "REQUESTED", expiresAt: new Date(Date.now()+60_000), recommendationState: "EXECUTION_READY", lifecycleState: "TRUSTED", evidencePointers: ["ev1"], approvalEventIds: ["a1"], projectedMonthlySavings: 10, targetEntityId: "u1", policyBlocks:["ADMIN_ACCOUNT_EXCLUDED"] });
  assert.equal(out.simulationState, "BLOCKED");
});
