import test from 'node:test';
import assert from 'node:assert/strict';
import { EconomicOperationsIntentService, type ExecutionIntentDto } from '../lib/economic-operations-intent-service';

function baseIntent(overrides: Partial<ExecutionIntentDto> = {}): ExecutionIntentDto {
  return { tenantId:'TENANT-US', executionId:'e1', actorId:'u1', actorRole:'FINOPS_OPERATOR', intentType:'SIMULATE', sourceSurface:'API', timestamp:new Date().toISOString(), reason:'test', requiredProofIds:['p1'], expectedStateTransition:{from:'PROPOSED',to:'SIMULATED'}, idempotencyKey:'k1', ...overrides };
}

function seeded(){ const svc=new EconomicOperationsIntentService(); svc.seedExecution({executionId:'e1',tenantId:'TENANT-US',state:'PROPOSED',approvalGranted:false,simulationReady:false,connectorReady:true,dataTrustReady:true,rollbackEligible:false,tenantExecutionMode:'ENFORCED',tenantMode:'PILOT_READ_ONLY',proofIds:['p1'],ledgerEntryId:'l1',fixtureBacked:false}); return svc; }

test('valid intent accepted',()=>{ const svc=seeded(); const res=svc.submitIntent(baseIntent()); assert.equal(res.reason,'INTENT_ACCEPTED'); });
test('missing actor rejected',()=>{ const svc=seeded(); const res=svc.submitIntent(baseIntent({actorId:''})); assert.equal(res.reason,'INTENT_REJECTED'); });
test('missing idempotency key rejected',()=>{ const svc=seeded(); const res=svc.submitIntent(baseIntent({idempotencyKey:''})); assert.equal(res.reason,'INTENT_REJECTED'); });
test('duplicate deterministic',()=>{ const svc=seeded(); svc.submitIntent(baseIntent()); const res=svc.submitIntent(baseIntent()); assert.equal(res.reason,'INTENT_DUPLICATE'); });
test('cross tenant rejected',()=>{ const svc=seeded(); const res=svc.submitIntent(baseIntent({tenantId:'OTHER'})); assert.equal(res.reason,'INTENT_REJECTED'); });
test('history persistence and proof completeness',()=>{ const svc=seeded(); svc.submitIntent(baseIntent()); assert.equal(svc.getActions('TENANT-US','e1').length,1); assert.equal(svc.getProofGraph('TENANT-US','e1')?.status,'PROOF_COMPLETE'); });
test('production tenant enforcement',()=>{ const svc=seeded(); const res=svc.submitIntent(baseIntent({tenantId:''}),'production'); assert.equal(res.reason,'INTENT_REJECTED'); });


test('pilot read only blocks execute by tenant mode',()=>{ const svc=seeded(); svc.seedExecution({executionId:'e2',tenantId:'TENANT-US',state:'APPROVED',approvalGranted:true,simulationReady:true,connectorReady:true,dataTrustReady:true,rollbackEligible:false,tenantExecutionMode:'ENFORCED',tenantMode:'PILOT_READ_ONLY',proofIds:['p2'],ledgerEntryId:'l2',fixtureBacked:false}); const res=svc.submitIntent(baseIntent({executionId:'e2',intentType:'EXECUTE',expectedStateTransition:{from:'APPROVED',to:'EXECUTED'},idempotencyKey:'k2'})); assert.equal(res.reason,'INTENT_BLOCKED_BY_TENANT_MODE'); });

test('demo permits fixture and marks outcome metadata',()=>{ const svc=new EconomicOperationsIntentService(); svc.seedExecution({executionId:'d1',tenantId:'TENANT-US',state:'PROPOSED',approvalGranted:false,simulationReady:true,connectorReady:true,dataTrustReady:true,rollbackEligible:false,tenantExecutionMode:'ENFORCED',tenantMode:'DEMO',proofIds:['p1'],ledgerEntryId:'ld1',fixtureBacked:true}); svc.submitIntent(baseIntent({executionId:'d1',expectedStateTransition:{from:'PROPOSED',to:'SIMULATED'},idempotencyKey:'kd1'})); const out=svc.getOutcome('TENANT-US','d1'); assert.equal(out?.ledgerEnvironment,'DEMO'); assert.equal(out?.isFixtureBacked,true); assert.equal(out?.isVerifiedSaving,false); });

test('production locked blocks mutation intents',()=>{ const svc=new EconomicOperationsIntentService(); svc.seedExecution({executionId:'p1',tenantId:'TENANT-US',state:'APPROVED',approvalGranted:true,simulationReady:true,connectorReady:true,dataTrustReady:true,rollbackEligible:true,tenantExecutionMode:'ENFORCED',tenantMode:'PRODUCTION_LOCKED',proofIds:['p1'],ledgerEntryId:'lp1',fixtureBacked:false}); const res=svc.submitIntent(baseIntent({executionId:'p1',intentType:'EXECUTE',expectedStateTransition:{from:'APPROVED',to:'EXECUTED'},idempotencyKey:'kp1'})); assert.equal(res.reason,'INTENT_BLOCKED_BY_TENANT_MODE'); });
