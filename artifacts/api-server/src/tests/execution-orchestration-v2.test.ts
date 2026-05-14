import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionAutomationRoutingService, ExecutionBlastRadiusService, ExecutionQueueService, transitionOrchestrationState } from "../lib/execution-orchestration";

test("state machine valid transitions", () => {
  const ok = transitionOrchestrationState("QUEUED", "READY");
  assert.equal(ok.valid, true);
});

test("state machine invalid transitions", () => {
  assert.throws(() => transitionOrchestrationState("DRAFT", "RUNNING"));
});

test("queue locking only allows READY", () => {
  const q = new ExecutionQueueService();
  q.enqueueItem({ id: "i1", tenantId: "t1", planId: "p1", recommendationId: "r1", status: "READY", attemptCount: 0, maxAttempts: 2, runtimeControlStatus: "ALLOW", riskClass: "A" });
  q.lockItem("i1", "w1");
  assert.throws(() => q.lockItem("i1", "w2"));
});

test("queue retry policy", () => {
  const q = new ExecutionQueueService();
  q.enqueueItem({ id: "i2", tenantId: "t1", planId: "p1", recommendationId: "r1", status: "READY", attemptCount: 0, maxAttempts: 2, runtimeControlStatus: "ALLOW", riskClass: "A" });
  assert.equal(q.markItemFailed("i2", "x").status, "RETRY_SCHEDULED");
  assert.equal(q.markItemFailed("i2", "x").status, "FAILED");
});

test("blast radius scoring", () => {
  const svc = new ExecutionBlastRadiusService();
  const r = svc.evaluate({ targetCount: 100, riskClass: "B", financialImpact: 50000, businessUnitCount: 5, criticalUserCount: 10, reversibility: false, dependencyDepth: 3 });
  assert.equal(r.blastRadiusBand, "CRITICAL");
});

test("automation routing preserves BLOCK/QUARANTINE/class C and approval", () => {
  const svc = new ExecutionAutomationRoutingService();
  assert.equal(svc.route({ riskClass: "A", runtimeControlStatus: "BLOCK", reversibility: true, blastRadiusBand: "LOW", recommendationTrust: 1, executionReadiness: 1, historicalSuccessRate: 1 }), "BLOCKED");
  assert.equal(svc.route({ riskClass: "A", runtimeControlStatus: "QUARANTINE", reversibility: true, blastRadiusBand: "LOW", recommendationTrust: 1, executionReadiness: 1, historicalSuccessRate: 1 }), "QUARANTINED");
  assert.equal(svc.route({ riskClass: "C", runtimeControlStatus: "ALLOW", reversibility: true, blastRadiusBand: "LOW", recommendationTrust: 1, executionReadiness: 1, historicalSuccessRate: 1 }), "RECOMMEND_ONLY");
  assert.equal(svc.route({ riskClass: "B", runtimeControlStatus: "ALLOW", reversibility: true, blastRadiusBand: "LOW", recommendationTrust: 1, executionReadiness: 1, historicalSuccessRate: 1, policyMode: "STRICT" }), "APPROVAL_REQUIRED");
});
