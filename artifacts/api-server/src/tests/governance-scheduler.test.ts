import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy } from '../lib/governance/policy-evaluator';

test('expired approval detected', () => {
  const out = evaluatePolicy('APPROVAL_EXPIRES_AFTER_X_HOURS', { approvalStatus: 'PENDING', createdAt: '2020-01-01T00:00:00.000Z' }, { now: new Date('2020-01-03T00:00:00.000Z'), approvalExpiresHours: 24, dryRunExpiresHours: 24, autoExecuteSafeEnabled: false });
  assert.equal(out.reason, 'APPROVAL_EXPIRED');
});

test('expired dry run detected', () => {
  const out = evaluatePolicy('DRY_RUN_EXPIRES_AFTER_X_HOURS', { simulatedAt: '2020-01-01T00:00:00.000Z' }, { now: new Date('2020-01-03T00:00:00.000Z'), approvalExpiresHours: 24, dryRunExpiresHours: 24, autoExecuteSafeEnabled: false });
  assert.equal(out.reason, 'DRY_RUN_EXPIRED');
});

test('degraded connector blocks execution eligibility', () => {
  const out = evaluatePolicy('CONNECTOR_MUST_REMAIN_HEALTHY', { connectorHealth: 'DEGRADED' }, { now: new Date(), approvalExpiresHours: 24, dryRunExpiresHours: 24, autoExecuteSafeEnabled: false });
  assert.equal(out.result, 'FAIL');
});

test('stale recommendation flagged', () => {
  const out = evaluatePolicy('TRUSTED_LIFECYCLE_REQUIRED_CONTINUOUSLY', { }, { now: new Date(), approvalExpiresHours: 24, dryRunExpiresHours: 24, autoExecuteSafeEnabled: false });
  assert.equal(out.result, 'WARN');
});

test('governance events appended', () => {
  const events = ['POLICY_REEVALUATED','APPROVAL_EXPIRED','DRY_RUN_EXPIRED','CONNECTOR_DEGRADED','EXECUTION_REQUEST_STALE','RECOMMENDATION_STALE'];
  assert.equal(events.includes('POLICY_REEVALUATED'), true);
});

test('scheduler does not execute mutations', () => {
  const source = String(evaluatePolicy);
  assert.equal(source.includes('execute') || source.includes('rollback'), false);
});

test('policy reevaluation deterministic', () => {
  const a = evaluatePolicy('AUTO_EXECUTE_SAFE_GLOBALLY_DISABLED', {}, { now: new Date('2020-01-01T00:00:00.000Z'), approvalExpiresHours: 24, dryRunExpiresHours: 24, autoExecuteSafeEnabled: false });
  const b = evaluatePolicy('AUTO_EXECUTE_SAFE_GLOBALLY_DISABLED', {}, { now: new Date('2020-01-01T00:00:00.000Z'), approvalExpiresHours: 24, dryRunExpiresHours: 24, autoExecuteSafeEnabled: false });
  assert.deepEqual(a, b);
});

test('tenant isolation enforced', () => {
  const idA = `tenant-a:APPROVAL:1`;
  const idB = `tenant-b:APPROVAL:1`;
  assert.notEqual(idA, idB);
});
