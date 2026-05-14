import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionOrchestrationProcessor } from "../lib/execution-orchestration/execution-orchestration-service";

function fakeQueue() {
  const state: any = { blocked: false, running: false };
  return {
    state,
    lockQueueItem: async () => ({ ok: true }),
    markBlocked: async () => { state.blocked = true; },
    markQuarantined: async () => { state.quarantined = true; },
    markRunning: async () => { state.running = true; },
    markFailed: async () => { state.failed = true; },
    markSucceeded: async () => { state.succeeded = true; },
  };
}

test("READY item becomes BLOCKED when runtime controls block at execution time", async () => {
  const q: any = fakeQueue();
  const p = new ExecutionOrchestrationProcessor(q as any, { emitFailSafe: async () => ({}) } as any);
  await p.processReadyItem("t1", "w1", { id: 1, planId: 1, actionType: "REMOVE_LICENSE", recommendationId: "r1", approvalStatus: "APPROVED", riskClass: "A", recentRollbackRate: 0.9 });
  assert.equal(q.state.blocked, true);
  assert.equal(q.state.running, false);
});

test("Class B approval-required item is blocked without approved status", async () => {
  const q: any = fakeQueue();
  const p = new ExecutionOrchestrationProcessor(q as any, { emitFailSafe: async () => ({}) } as any);
  await p.processReadyItem("t1", "w1", { id: 2, planId: 1, actionType: "REMOVE_LICENSE", recommendationId: "r2", approvalStatus: "PENDING", riskClass: "B" });
  assert.equal(q.state.blocked, true);
  assert.equal(q.state.running, false);
});
