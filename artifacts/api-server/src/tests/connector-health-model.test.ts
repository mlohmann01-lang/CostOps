import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConnectorHealth, getConnectorHealthImpact, isConnectorSafeForExecution } from '../lib/connectors/connector-health-model';

const baseInput = { tenantId: 'T1', connectorId: 'M365', provider: 'microsoft365' };

test('healthy state when sync succeeds', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'SUCCESS' });
  assert.equal(h.healthState, 'HEALTHY');
  assert.equal(h.trustScore, 1.0);
});

test('auth failed sets AUTH_FAILED state', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'AUTH_FAILED' });
  assert.equal(h.healthState, 'AUTH_FAILED');
  assert.equal(h.trustScore, 0.0);
  assert.ok(h.lastFailedSyncAt);
});

test('missing scopes sets MISSING_SCOPES state', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'SCOPE_MISSING', missingScopes: ['User.Read.All'] });
  assert.equal(h.healthState, 'MISSING_SCOPES');
  assert.deepEqual(h.missingScopes, ['User.Read.All']);
});

test('rate limited sets RATE_LIMITED state with rateLimitUntil', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'RATE_LIMITED', rateLimitUntilMs: 60000 });
  assert.equal(h.healthState, 'RATE_LIMITED');
  assert.ok(h.rateLimitUntil);
  assert.equal(h.trustScore, 0.5);
});

test('failure sets DEGRADED state', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'FAILURE' });
  assert.equal(h.healthState, 'DEGRADED');
  assert.equal(h.trustScore, 0.3);
});

test('stale data sets STALE state', () => {
  const h = evaluateConnectorHealth({ ...baseInput, stalenessAgeDays: 30 });
  assert.equal(h.healthState, 'STALE');
  assert.ok(h.stalenessReason);
  assert.ok(h.trustScore < 1.0);
});

test('partial capabilities sets PARTIAL state', () => {
  const h = evaluateConnectorHealth({ ...baseInput, capabilities: { sync: true, write: false } });
  assert.equal(h.healthState, 'PARTIAL');
  assert.equal(h.trustScore, 0.7);
});

test('DEGRADED blocks execution', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'FAILURE' });
  const impact = getConnectorHealthImpact(h);
  assert.equal(impact.blocksExecution, true);
  assert.equal(impact.requiresOperatorAlert, true);
});

test('AUTH_FAILED blocks sync and execution', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'AUTH_FAILED' });
  const impact = getConnectorHealthImpact(h);
  assert.equal(impact.blocksExecution, true);
  assert.equal(impact.blocksSync, true);
  assert.ok(impact.readinessBlockers.some((b) => b.includes('AUTH_FAILED')));
});

test('MISSING_SCOPES creates readiness blockers', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'SCOPE_MISSING', missingScopes: ['User.Read.All'] });
  const impact = getConnectorHealthImpact(h);
  assert.equal(impact.blocksExecution, true);
  assert.ok(impact.readinessBlockers.some((b) => b.includes('MISSING_SCOPES')));
});

test('HEALTHY connector is safe for execution', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'SUCCESS' });
  assert.equal(isConnectorSafeForExecution(h), true);
});

test('AUTH_FAILED connector is not safe for execution', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'AUTH_FAILED' });
  assert.equal(isConnectorSafeForExecution(h), false);
});

test('RATE_LIMITED only blocks sync not execution', () => {
  const h = evaluateConnectorHealth({ ...baseInput, lastSyncResult: 'RATE_LIMITED' });
  const impact = getConnectorHealthImpact(h);
  assert.equal(impact.blocksSync, true);
  assert.equal(impact.blocksExecution, false);
});

test('STALE lowers trust score and flags in blockers', () => {
  const h = evaluateConnectorHealth({ ...baseInput, stalenessAgeDays: 45 });
  const impact = getConnectorHealthImpact(h);
  assert.equal(impact.lowersTrustScore, true);
  assert.ok(impact.readinessBlockers.some((b) => b.includes('STALE')));
});
