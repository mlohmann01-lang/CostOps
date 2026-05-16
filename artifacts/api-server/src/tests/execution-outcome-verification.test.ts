import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionOutcomeVerificationService } from "../lib/execution-orchestration/execution-outcome-verification-service";

test("duplicate outcomeLedgerId does not create duplicate verification", async () => {
  let inserts = 0;
  const repo: any = {
    db: { insert: () => ({ values: () => ({ returning: async () => { inserts++; return [{ id: 1 }]; } }) }) },
    getVerificationByOutcomeLedgerId: async (_t:string, id:string) => inserts ? { id: 1, outcomeLedgerId: id } : null,
  };
  const svc = new ExecutionOutcomeVerificationService(repo);
  await svc.createVerificationTask({ tenantId: "t1", outcomeLedgerId: "10", planId: 1, queueItemId: 2, actionType: "X", targetEntityId: "u", correlationId: "c1" });
  await svc.createVerificationTask({ tenantId: "t1", outcomeLedgerId: "10", planId: 1, queueItemId: 2, actionType: "X", targetEntityId: "u", correlationId: "c1" });
  assert.equal(inserts, 1);
});

test("mark verified records actual savings", async () => {
  let patch: any;
  const svc = new ExecutionOutcomeVerificationService({ updateVerification: async (_t:string,_i:number,p:any)=>(patch=p,p) } as any);
  await svc.markVerified("t1", 3, { actualMonthlySaving: 12, actualAnnualSaving: 144, verificationEvidence: { proof: true } });
  assert.equal(patch.verificationStatus, "VERIFIED");
  assert.equal(patch.actualAnnualSaving, 144);
});

test("mark failed creates rollback escalation", async () => {
  let escalated = false;
  const repo: any = {
    updateVerification: async () => ({ id: 1, planId: 1, queueItemId: 2, correlationId: "c1", actualOutcome: "FAILED" }),
    createEscalation: async (e:any) => { escalated = e.escalationType === "ROLLBACK_RECOMMENDED"; return e; },
  };
  const svc = new ExecutionOutcomeVerificationService(repo);
  await svc.markFailed("t1", 1, {});
  assert.equal(escalated, true);
});

test("drift detected creates rollback review but no auto rollback", async () => {
  let rollbackCalled = false;
  const repo: any = {
    getVerification: async () => ({ id: 1, tenantId: "t1", verificationMethod: "LEDGER_ONLY", outcomeLedgerId: "7", planId: 1, queueItemId: 2, correlationId: "c1", verificationEvidence: {} }),
    getOutcomeLedgerById: async () => ({ id: 7, executionStatus: "DRIFTED" }),
    updateVerification: async () => ({ id: 1, planId: 1, queueItemId: 2, correlationId: "c1" }),
    createEscalation: async () => ({}),
    rollbackOutcome: async () => { rollbackCalled = true; },
  };
  const svc = new ExecutionOutcomeVerificationService(repo);
  await svc.evaluateVerificationTask("t1", 1);
  assert.equal(rollbackCalled, false);
});
