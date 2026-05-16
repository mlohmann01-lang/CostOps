import test from "node:test";
import assert from "node:assert/strict";
import { SavingsProofService } from "../lib/execution-orchestration/savings-proof-service";

const sample = [
  { actionType:"A", verificationStatus:"VERIFIED", expectedMonthlySaving:100, expectedAnnualSaving:1200, actualMonthlySaving:90, actualAnnualSaving:1080, planId:1, createdAt:new Date() },
  { actionType:"A", verificationStatus:"DISPUTED", expectedMonthlySaving:40, expectedAnnualSaving:480, actualMonthlySaving:10, actualAnnualSaving:120, planId:1, createdAt:new Date() },
  { actionType:"B", verificationStatus:"FAILED", expectedMonthlySaving:20, expectedAnnualSaving:240, planId:2, createdAt:new Date() },
  { actionType:"B", verificationStatus:"NEEDS_ROLLBACK_REVIEW", expectedMonthlySaving:10, expectedAnnualSaving:120, planId:2, createdAt:new Date() },
];

test("expected savings not counted as verified", async ()=>{
  const svc = new SavingsProofService({ listVerifications: async()=>sample, listPlans: async()=>[] } as any);
  const r:any = await svc.getSavingsProofSummary("t1");
  assert.equal(r.expectedMonthlySavings, 170);
  assert.equal(r.verifiedMonthlySavings, 90);
});

test("buckets separate correctly + confidence", async ()=>{
  const svc = new SavingsProofService({ listVerifications: async()=>sample, listPlans: async()=>[{id:1,playbookId:"P1"},{id:2,playbookId:"P2"}] } as any);
  const r:any = await svc.getSavingsProofSummary("t1");
  assert.equal(r.disputedMonthlySavings, 10);
  assert.equal(r.failedMonthlySavings, 20);
  assert.equal(r.rollbackReviewMonthlySavings, 10);
  assert.equal(r.savingsConfidence, "MEDIUM");
});

test("timeline and breakdowns group correctly", async ()=>{
  const now = new Date();
  const svc = new SavingsProofService({ listVerifications: async()=>sample.map((s,i)=>({...s, createdAt: new Date(now.getTime()-i*86400000)})), listPlans: async()=>[{id:1,playbookId:"P1"},{id:2,playbookId:"P2"}] } as any);
  const byAction:any[] = await svc.getSavingsProofByActionType("t1");
  const byStatus:any[] = await svc.getSavingsProofByStatus("t1");
  const byPlaybook:any[] = await svc.getSavingsProofByPlaybook("t1");
  const tl:any[] = await svc.getSavingsProofTimeline("t1", "90d");
  assert.equal(byAction.length > 0, true);
  assert.equal(byStatus.some((x)=>x.verificationStatus==="FAILED"), true);
  assert.equal(byPlaybook.some((x)=>x.playbookId==="P1"), true);
  assert.equal(tl.length > 0, true);
});
