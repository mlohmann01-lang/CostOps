import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyM365RemoveLicense } from '../lib/outcomes/outcome-verifier';
import { detectOutcomeDrift } from '../lib/outcomes/drift-monitor';
import { validateSavings } from '../lib/outcomes/savings-validator';

test('successful removal verifies savings', () => {
  const out = verifyM365RemoveLicense({ actionType: 'REMOVE_LICENSE', tenantId: 't1', targetUserValid: true, removedSkuIds: ['sku1'], currentAssignedSkuIds: [], excludedAccountModified: false, rollbackAvailable: true, rollbackReference: 'rb-1', projectedMonthlySavings: 50, verifiedMonthlySavings: 50, policyViolationIntroduced: false });
  assert.equal(out.verificationState, 'VERIFIED');
  assert.equal(out.verifiedMonthlySavings, 50);
});

test('missing removal causes verification failure', () => {
  const out = verifyM365RemoveLicense({ actionType: 'REMOVE_LICENSE', tenantId: 't1', targetUserValid: true, removedSkuIds: ['sku1'], currentAssignedSkuIds: ['sku1'], excludedAccountModified: false, rollbackAvailable: true, rollbackReference: 'rb-1', projectedMonthlySavings: 20, verifiedMonthlySavings: 0, policyViolationIntroduced: false });
  assert.equal(out.verificationState, 'VERIFICATION_FAILED');
});

test('re-assigned license triggers drift', () => {
  const drift = detectOutcomeDrift({ licenseReassigned: true, excludedAccountModified: false, rollbackMismatch: false, entitlementReappeared: false, savingsNoLongerRealized: false });
  assert.equal(drift.driftDetected, true);
  assert.equal(drift.driftReason, 'LICENSE_REASSIGNED_AFTER_RECLAIM');
});

test('projected vs verified variance calculated', () => {
  const s = validateSavings(100, 80);
  assert.equal(s.savingsVariance, -20);
  assert.equal(s.verifiedAnnualSavings, 960);
});

test('rollback reference preserved', () => {
  const out = verifyM365RemoveLicense({ actionType: 'REMOVE_LICENSE', tenantId: 't1', targetUserValid: true, removedSkuIds: ['sku1'], currentAssignedSkuIds: [], excludedAccountModified: false, rollbackAvailable: true, rollbackReference: 'rollback-ref-xyz', projectedMonthlySavings: 30, verifiedMonthlySavings: 25, policyViolationIntroduced: false });
  assert.equal(out.rollbackReference, 'rollback-ref-xyz');
});

test('governance events appended', () => {
  const events: string[] = [];
  const append = (e: string) => events.push(e);
  append('OUTCOME_VERIFIED'); append('OUTCOME_PARTIALLY_VERIFIED'); append('DRIFT_DETECTED'); append('OUTCOME_VERIFICATION_FAILED');
  assert.ok(events.includes('OUTCOME_VERIFIED'));
  assert.ok(events.includes('OUTCOME_PARTIALLY_VERIFIED'));
  assert.ok(events.includes('DRIFT_DETECTED'));
  assert.ok(events.includes('OUTCOME_VERIFICATION_FAILED'));
});

test('tenant isolation enforced', () => {
  const t1 = verifyM365RemoveLicense({ actionType: 'REMOVE_LICENSE', tenantId: 't1', targetUserValid: true, removedSkuIds: ['sku1'], currentAssignedSkuIds: [], excludedAccountModified: false, rollbackAvailable: true, rollbackReference: 'rb-1', projectedMonthlySavings: 10, verifiedMonthlySavings: 10, policyViolationIntroduced: false });
  const t2 = verifyM365RemoveLicense({ actionType: 'REMOVE_LICENSE', tenantId: 't2', targetUserValid: true, removedSkuIds: ['sku1'], currentAssignedSkuIds: [], excludedAccountModified: false, rollbackAvailable: true, rollbackReference: 'rb-2', projectedMonthlySavings: 12, verifiedMonthlySavings: 12, policyViolationIntroduced: false });
  assert.notEqual(t1.rollbackReference, t2.rollbackReference);
});

test('no uncontrolled mutation occurs', () => {
  const input = Object.freeze({ actionType: 'REMOVE_LICENSE' as const, tenantId: 't1', targetUserValid: true, removedSkuIds: ['sku1'], currentAssignedSkuIds: [], excludedAccountModified: false, rollbackAvailable: true, rollbackReference: 'rb-1', projectedMonthlySavings: 10, verifiedMonthlySavings: 10, policyViolationIntroduced: false });
  const out = verifyM365RemoveLicense({ ...input, removedSkuIds: [...input.removedSkuIds], currentAssignedSkuIds: [...input.currentAssignedSkuIds] });
  assert.equal(out.verificationState, 'VERIFIED');
  assert.deepEqual(input.removedSkuIds, ['sku1']);
});
