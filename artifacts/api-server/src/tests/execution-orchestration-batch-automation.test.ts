import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionAutomationPromotionService, ExecutionBatchService } from "../lib/execution-orchestration/execution-orchestration-service";

test("batch readiness blocks unresolved dependencies", async () => {
  const repo: any = { getBatch: async()=>({id:1,tenantId:"t1"}), getBatchItems: async()=>[{queueItemId:1}], updateItem: async()=>({status:"WAITING_DEPENDENCIES"}), updateBatch: async(_t:string,_i:number,p:any)=>p };
  const svc = new ExecutionBatchService(repo, { emitFailSafe: async()=>({}) } as any, {} as any);
  const out = await svc.evaluateBatchReadiness("t1", 1);
  assert.equal(out.status, "WAITING_DEPENDENCIES");
});

test("batch readiness blocks quarantined item", async () => {
  const repo: any = { getBatch: async()=>({id:1,tenantId:"t1"}), getBatchItems: async()=>[{queueItemId:1}], updateItem: async()=>({status:"QUARANTINED"}), updateBatch: async(_t:string,_i:number,p:any)=>p };
  const svc = new ExecutionBatchService(repo, { emitFailSafe: async()=>({}) } as any, {} as any);
  const out = await svc.evaluateBatchReadiness("t1", 1);
  assert.equal(out.status, "BLOCKED");
});

test("batch respects max item count", async () => {
  const svc = new ExecutionBatchService({ assignBatchItems: async (rows:any[]) => rows } as any, {} as any, {} as any);
  const out = await svc.assignItemsToBatch(1, Array.from({length:30},(_,i)=>({id:i,tenantId:"t1"})), {maxItemsPerBatch:25});
  assert.equal(out.length, 25);
});

test("HIGH blast-radius requires sample batch", async () => {
  const repo: any = { getBatch: async()=>({id:1,tenantId:"t1",isSampleBatch:false}), getBatchItems: async()=>[{queueItemId:1}], updateItem: async()=>({status:"READY",blastRadiusBand:"HIGH",riskClass:"A",approvalStatus:"APPROVED"}), updateBatch: async(_t:string,_i:number,p:any)=>p };
  const svc = new ExecutionBatchService(repo, { emitFailSafe: async()=>({}) } as any, {} as any);
  const out = await svc.evaluateBatchReadiness("t1", 1);
  assert.equal(out.readiness, "SAMPLE_REQUIRED");
});

test("automation candidate requires successful supervised runs", () => {
  const svc = new ExecutionAutomationPromotionService();
  const out = svc.evaluatePromotion({ currentMode:"SUPERVISED_EXECUTION", successfulRuns: 2, verifiedSampleBatches: 0, failureRatePercent: 0, rollbackAvailable: true, riskClass:"A", blastRadiusBand:"LOW" });
  assert.equal(out.promotionStatus, "CANDIDATE");
});

test("Class B cannot promote to AUTO_EXECUTE_SAFE by default", () => {
  const svc = new ExecutionAutomationPromotionService();
  const out = svc.evaluatePromotion({ currentMode:"SCHEDULED_SUPERVISED", successfulRuns: 20, verifiedSampleBatches: 3, failureRatePercent: 0, rollbackAvailable: true, riskClass:"B", blastRadiusBand:"LOW" });
  assert.notEqual(out.recommendedMode, "AUTO_EXECUTE_SAFE");
});

test("runtime BLOCK demotes automation candidate", () => {
  const svc = new ExecutionAutomationPromotionService();
  const out = svc.evaluateDemotion({ currentMode:"AUTO_EXECUTE_SAFE", lastRuntimeBlockAt:new Date(), failureRatePercent:0, rollbackAvailable:true });
  assert.equal(out?.event, "AUTOMATION_DEMOTED");
});

test("critical escalation revokes auto-safe eligibility", () => {
  const svc = new ExecutionAutomationPromotionService();
  const out = svc.evaluateDemotion({ currentMode:"AUTO_EXECUTE_SAFE", lastCriticalEscalationAt:new Date(), failureRatePercent:0, rollbackAvailable:true });
  assert.equal(out?.event, "AUTOMATION_REVOKED");
});
