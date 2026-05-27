import test from 'node:test';
import assert from 'node:assert/strict';
import { rollupSavings } from '../lib/outcomes/savings-rollup';

test('projected and verified savings roll up correctly', () => {
  const r = rollupSavings([{ monthlySaving: 100, annualisedSaving: 1200, evidence: { verifiedSaving: 80, verificationState: 'VERIFIED' } }, { monthlySaving: 50, annualisedSaving: 600, evidence: { verifiedSaving: 50, verificationState: 'PENDING_VERIFICATION' } }]);
  assert.equal(r.projectedMonthlySavings, 150);
  assert.equal(r.verifiedMonthlySavings, 130);
});

test('variance calculated correctly', () => {
  const r = rollupSavings([{ monthlySaving: 100, annualisedSaving: 1200, evidence: { verifiedSaving: 90, verificationState: 'VERIFIED' } }]);
  assert.equal(r.savingsVariance, -10);
});

test('grouped by playbook and grouped by state semantics', () => {
  const rows = [{ action: 'PB1', monthlySaving: 10, evidence: { verificationState: 'VERIFIED', verifiedSaving: 10 } }, { action: 'PB1', monthlySaving: 20, evidence: { verificationState: 'PENDING_VERIFICATION', verifiedSaving: 0 } }, { action: 'PB2', monthlySaving: 30, evidence: { verificationState: 'FAILED_VERIFICATION', verifiedSaving: 0 } }];
  const r = rollupSavings(rows as any);
  assert.equal(r.pendingVerificationCount, 1);
  assert.equal(r.failedVerificationCount, 1);
});

test('failed/pending/drift counts correct', () => {
  const r = rollupSavings([{ monthlySaving: 10, evidence: { verificationState: 'PENDING_VERIFICATION' } }, { monthlySaving: 10, evidence: { verificationState: 'FAILED_VERIFICATION' } }, { monthlySaving: 10, evidence: { verificationState: 'VERIFIED', driftStatus: 'DRIFT_DETECTED' } }]);
  assert.equal(r.pendingVerificationCount, 1);
  assert.equal(r.failedVerificationCount, 1);
  assert.equal(r.driftDetectedCount, 1);
});

test('tenant isolation enforced', () => {
  const t1 = [{ tenantId: 't1', monthlySaving: 10, evidence: { verifiedSaving: 10 } }];
  const t2 = [{ tenantId: 't2', monthlySaving: 15, evidence: { verifiedSaving: 15 } }];
  assert.notDeepEqual(rollupSavings(t1 as any), rollupSavings(t2 as any));
});
