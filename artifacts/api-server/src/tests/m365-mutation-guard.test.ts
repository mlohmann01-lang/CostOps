import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLiveM365MutationAllowed } from '../domain/m365/mutationGuard';

const valid = {
  runtimeEnvironment: 'LIVE',
  approvalState: 'APPROVED',
  riskClass: 'LOW',
  trustScore: 95,
  connectorCapability: 'GOVERNED_EXECUTION',
  idempotencyKey: 'idem-1',
};

test('blocks when ENABLE_LIVE_M365_EXECUTION is not true', () => {
  delete process.env.ENABLE_LIVE_M365_EXECUTION;
  assert.throws(() => assertLiveM365MutationAllowed(valid));
});

test('blocks non-LIVE runtime', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.throws(() => assertLiveM365MutationAllowed({ ...valid, runtimeEnvironment: 'DEMO' }));
});

test('blocks missing idempotency key', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.throws(() => assertLiveM365MutationAllowed({ ...valid, idempotencyKey: undefined }));
});

test('blocks when approval not approved', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.throws(() => assertLiveM365MutationAllowed({ ...valid, approvalState: 'PENDING' }));
});

test('blocks when capability is not governed execution', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.throws(() => assertLiveM365MutationAllowed({ ...valid, connectorCapability: 'READ_ONLY' }));
});

test('blocks trust below threshold', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.throws(() => assertLiveM365MutationAllowed({ ...valid, trustScore: 89 }));
});

test('blocks non-low risk', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.throws(() => assertLiveM365MutationAllowed({ ...valid, riskClass: 'HIGH' }));
});

test('passes only for fully valid context with env enabled', () => {
  process.env.ENABLE_LIVE_M365_EXECUTION = 'true';
  assert.doesNotThrow(() => assertLiveM365MutationAllowed(valid));
});
