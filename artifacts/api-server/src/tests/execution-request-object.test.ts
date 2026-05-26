import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionRequest } from "../lib/execution/execution-request-builder";

const base = {
  tenantId: "t1",
  recommendationId: "r1",
  requestedBy: "op",
  idempotencyKey: "k1",
  approvalEventIds: ["1"],
  recommendation: {
    recommendationState: "EXECUTION_READY",
    executionReadiness: "AUTO_EXECUTE_ELIGIBLE" as const,
    playbookId: "pb",
    targetEntityId: "u1",
    actionType: "REMOVE_LICENSE",
    actionRiskClass: "B" as const,
    evidencePointers: ["ev1"],
  },
};

test("execution request created from execution-ready recommendation", () => {
  const r = buildExecutionRequest(base);
  assert.equal(r.executionState, "REQUESTED");
});

test("missing approval event blocks request", () => {
  const r = buildExecutionRequest({ ...base, approvalEventIds: [] });
  assert.equal(r.executionState, "BLOCKED");
});

test("missing evidence blocks request", () => {
  const r = buildExecutionRequest({ ...base, recommendation: { ...base.recommendation, evidencePointers: [] } });
  assert.equal(r.executionState, "BLOCKED");
});

test("Class B REMOVE_LICENSE requires dry run and rollback plan", () => {
  const r = buildExecutionRequest(base);
  assert.equal(r.dryRunRequired, true);
  assert.equal(r.rollbackRequired, true);
});
