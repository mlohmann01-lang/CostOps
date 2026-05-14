import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionQueueService } from "../lib/execution-orchestration/execution-orchestration-service";

function setup(planStatus = "PAUSED", itemStatus = "FAILED") {
  const events: any[] = [];
  const plan: any = { id: 1, tenantId: "t1", status: planStatus, correlationId: "c1" };
  const item: any = { id: 11, tenantId: "t1", planId: 1, status: itemStatus, correlationId: "i1" };
  const repo: any = {
    updatePlan: async (_t:string,_id:number,patch:any)=>Object.assign(plan, patch),
    getPlanItems: async ()=>[],
    listDependenciesForItem: async ()=>[],
    updateItem: async (_t:string,id:number,patch:any)=>{ if(id===11) return Object.assign(item, patch); return null; },
    appendEvent: async (e:any)=>{ events.push(e); return e; },
  };
  return { svc: new ExecutionQueueService(repo), plan, item, events };
}

test("paused plan can resume", async () => {
  const { svc, plan, events } = setup("PAUSED", "FAILED");
  await svc.resumePlan(plan, "op");
  assert.equal(plan.status, "READY");
  assert.ok(events.some((e) => e.eventType === "PLAN_RESUMED"));
});

test("cancelled plan cannot resume", async () => {
  const { svc, plan } = setup("CANCELLED", "FAILED");
  await assert.rejects(() => svc.resumePlan(plan, "op"));
});

test("blocked item cannot retry", async () => {
  const { svc } = setup("PAUSED", "BLOCKED");
  await assert.rejects(() => svc.retryQueueItem("t1", 11, "op"));
});

test("failed item can be marked retry scheduled", async () => {
  const { svc, item, events } = setup("PAUSED", "FAILED");
  await svc.retryQueueItem("t1", 11, "op");
  assert.equal(item.status, "RETRY_SCHEDULED");
  assert.ok(events.some((e) => e.eventType === "ITEM_RETRY_REQUESTED"));
});

test("ready item can cancel", async () => {
  const { svc, item, events } = setup("PAUSED", "READY");
  await svc.cancelQueueItem("t1", 11, "op");
  assert.equal(item.status, "CANCELLED");
  assert.ok(events.some((e) => e.eventType === "ITEM_CANCELLED"));
});

test("running item cancel is rejected safely", async () => {
  const { svc } = setup("PAUSED", "RUNNING");
  await assert.rejects(() => svc.cancelQueueItem("t1", 11, "op"));
});
