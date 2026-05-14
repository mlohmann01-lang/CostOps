import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionDependencyService, ExecutionEscalationService, ExecutionOrchestrationProcessor, ExecutionSlaService } from "../lib/execution-orchestration/execution-orchestration-service";

test("item with unresolved dependency is not selected for execution", async () => {
  const repo: any = { listDependenciesForItem: async () => [{ status: "PENDING", dependencyType: "MUST_COMPLETE" }], updateItem: async () => ({}) };
  const svc = new ExecutionDependencyService(repo, {} as any);
  const r = await svc.evaluateItemDependencyReadiness("t1", 1);
  assert.equal(r.ready, false);
});

test("item becomes READY after dependency resolution", async () => {
  const repo: any = { listDependenciesForItem: async () => [{ status: "RESOLVED", dependencyType: "MUST_COMPLETE" }], updateItem: async (_t:string,_q:number,p:any)=>p };
  const svc = new ExecutionDependencyService(repo, {} as any);
  const r = await svc.evaluateItemDependencyReadiness("t1", 1);
  assert.equal(r.ready, true);
});

test("failed MUST_SUCCEED dependency escalates dependent item", async () => {
  let escalated = false;
  const repo: any = { failDependency: async () => ({ id: 1, planId: 1, queueItemId: 2, dependencyType: "MUST_SUCCEED" }) };
  const escalation: any = { escalateQueueItem: async () => { escalated = true; } };
  const svc = new ExecutionDependencyService(repo, escalation);
  await svc.failDependency("t1", 1, "failed");
  assert.equal(escalated, true);
});

test("runtime BLOCK creates escalation", async () => {
  let escalated = false;
  const q: any = { lockQueueItem: async()=>({ok:true}), markBlocked: async()=>({}), markQuarantined: async()=>({}), markRunning: async()=>({}), markFailed: async()=>({}), markSucceeded: async()=>({}) };
  const esc: any = { escalateQueueItem: async ()=> { escalated = true; } };
  const p = new ExecutionOrchestrationProcessor(q, { emitFailSafe: async()=>({}) } as any, esc);
  await p.processReadyItem("t1", "w1", { id: 1, planId: 1, correlationId: "c1", actionType: "REMOVE_LICENSE", approvalStatus: "APPROVED", recommendationId: "r1", riskClass: "A", recentRollbackRate: 0.9 });
  assert.equal(escalated, true);
});

test("SLA breach creates escalation but does not execute item", async () => {
  let escalated = false;
  const repo: any = { listActiveQueueItems: async () => [{ id: 1, tenantId: "t1", planId: 1, correlationId: "c1", status: "READY", createdAt: new Date(Date.now() - 31 * 60_000) }], updateItem: async()=>({}) };
  const esc: any = { escalateQueueItem: async ()=> { escalated = true; } };
  const sla = new ExecutionSlaService(repo, esc, { emitFailSafe: async()=>({}) } as any);
  await sla.checkSlaBreaches("t1");
  assert.equal(escalated, true);
});

test("CRITICAL blast radius prevents execution", async () => {
  const state: any = {};
  const q: any = { lockQueueItem: async()=>({ok:true}), markBlocked: async()=>{state.blocked=true;}, markQuarantined: async()=>({}), markRunning: async()=>{state.running=true;}, markFailed: async()=>({}), markSucceeded: async()=>({}) };
  const p = new ExecutionOrchestrationProcessor(q, { emitFailSafe: async()=>({}) } as any, { escalateQueueItem: async()=>({}) } as any);
  await p.processReadyItem("t1", "w1", { id: 1, planId: 1, correlationId: "c1", blastRadiusBand: "CRITICAL", approvalStatus: "APPROVED" });
  assert.equal(state.blocked, true);
  assert.equal(Boolean(state.running), false);
});
