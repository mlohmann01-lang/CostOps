import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateExecutionRequest } from '../lib/execution/dry-run-simulator';
import { runExecutionEngine } from '../lib/execution/execution-engine';

const base = {
  simulationId: 's1', executionRequestId: 'er1', actionType: 'RECLAIM_COPILOT_LICENSE', executionState: 'REQUESTED', expiresAt: new Date(Date.now()+60_000), recommendationState: 'EXECUTION_READY', lifecycleState: 'TRUSTED', evidencePointers: ['m365:copilot-sku:COPILOT_M365','m365:copilot-usage:prompt_count:0','m365:copilot-assignment-snapshot:COPILOT_M365'], approvalEventIds: ['a1'], projectedMonthlySavings: 30, targetEntityId: 'u1'
};

test('valid approved Copilot reclaim request produces READY_FOR_EXECUTION simulation', () => {
  const out = simulateExecutionRequest(base as any);
  assert.equal(out.simulationState, 'READY_FOR_EXECUTION');
});

test('missing Copilot SKU blocks simulation', () => {
  const out = simulateExecutionRequest({ ...base, evidencePointers: ['m365:copilot-usage:prompt_count:0'] } as any);
  assert.equal(out.simulationState, 'BLOCKED');
  assert.ok(out.validationErrors.includes('COPILOT_SKU_EVIDENCE_MISSING'));
});

test('missing usage evidence blocks simulation', () => {
  const out = simulateExecutionRequest({ ...base, evidencePointers: ['m365:copilot-sku:COPILOT_M365'] } as any);
  assert.equal(out.simulationState, 'BLOCKED');
  assert.ok(out.validationErrors.includes('COPILOT_USAGE_EVIDENCE_MISSING'));
});

test('VIP/compliance/pilot exclusion blocks simulation', () => {
  const out = simulateExecutionRequest({ ...base, evidencePointers: [...base.evidencePointers, 'exclusion:vip'] } as any);
  assert.equal(out.simulationState, 'BLOCKED');
});

test('rollback plan generated', () => {
  const out = simulateExecutionRequest(base as any);
  assert.equal(out.rollbackSupported, true);
  assert.equal(String((out.rollbackPlan as any).action), 'restore-copilot-licence');
});

test('projected savings validated', () => {
  const out = simulateExecutionRequest({ ...base, projectedMonthlySavings: 42 } as any);
  assert.equal(out.projectedSavingsValidated, 42);
});

test('dry run does not mutate recommendation/request state', () => {
  const input: any = { ...base };
  const copy = JSON.parse(JSON.stringify(input));
  simulateExecutionRequest(input);
  assert.deepEqual({ ...input, expiresAt: input.expiresAt.toISOString() }, { ...copy, expiresAt: copy.expiresAt });
});

test('no execution support exists for RECLAIM_COPILOT_LICENSE', async () => {
  const out = await runExecutionEngine({ tenantId: 't1', actorId: 'a1', mode: 'APPROVAL_EXECUTE', mvpMode: true, recommendation: { id: 1, action: 'RECLAIM_COPILOT_LICENSE', actionRiskProfile: { riskClass: 'B' }, criticalBlockers: [], userEmail: 'u@c.com', licenceSku: 'COPILOT_M365' } });
  assert.equal(out.executed, false);
  assert.ok(((out as any).denialReasons ?? []).includes('COPILOT_RECLAIM_EXECUTION_NOT_SUPPORTED'));
});
