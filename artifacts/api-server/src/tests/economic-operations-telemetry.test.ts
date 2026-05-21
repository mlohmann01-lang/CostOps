import test from 'node:test';
import assert from 'node:assert/strict';
import { EconomicOperationsTelemetry } from '../lib/economic-operations-telemetry';

function makeTelemetry() { return new EconomicOperationsTelemetry(); }

test('records job metrics by type and status', () => {
  const t = makeTelemetry();
  t.recordJobCompleted('M365_READ_ONLY_SYNC', 'SUCCEEDED', 1500);
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'job_count' && m.labels.jobType === 'M365_READ_ONLY_SYNC'));
});

test('records sync duration for sync jobs', () => {
  const t = makeTelemetry();
  t.recordJobCompleted('M365_READ_ONLY_SYNC', 'SUCCEEDED', 2000);
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'sync_duration_ms' && m.value === 2000));
});

test('records execution attempt as allowed', () => {
  const t = makeTelemetry();
  t.recordExecutionAttempt('T1', 'ALLOWED');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'execution_attempts' && m.labels.tenantId === 'T1'));
});

test('records execution blocked metric', () => {
  const t = makeTelemetry();
  t.recordExecutionAttempt('T1', 'BLOCKED');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'execution_blocked'));
});

test('records verification success', () => {
  const t = makeTelemetry();
  t.recordVerification('T1', 'SUCCESS');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'verification_success'));
});

test('records verification failure', () => {
  const t = makeTelemetry();
  t.recordVerification('T1', 'FAILURE');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'verification_failure'));
});

test('records drift detection', () => {
  const t = makeTelemetry();
  t.recordDrift('T1');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'drift_detected' && m.labels.tenantId === 'T1'));
});

test('records graph rate limit', () => {
  const t = makeTelemetry();
  t.recordGraphRateLimit('T1');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'graph_rate_limit_hit'));
});

test('records connector health state', () => {
  const t = makeTelemetry();
  t.recordConnectorHealth('T1', 'M365', 'DEGRADED');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'connector_health_state' && m.labels.healthState === 'DEGRADED'));
});

test('records API latency', () => {
  const t = makeTelemetry();
  t.recordApiLatency('/api/economic-operations/intent', 120);
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'api_latency_ms' && m.value === 120));
});

test('records lock contention', () => {
  const t = makeTelemetry();
  t.recordLockContention('T1', 'm365:user');
  const metrics = t.getMetrics();
  assert.ok(metrics.some((m) => m.name === 'lock_contention'));
});

test('structured log includes required fields', () => {
  const t = makeTelemetry();
  t.log({ tenantId: 'T1', executionId: 'exec-1', action: 'EXECUTE', result: 'ALLOWED', correlationId: 'corr-1', latencyMs: 200 });
  const logs = t.getLogs();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].tenantId, 'T1');
  assert.equal(logs[0].executionId, 'exec-1');
  assert.ok(logs[0].timestamp);
});

test('generates unique correlation IDs', () => {
  const t = makeTelemetry();
  const id1 = t.generateCorrelationId();
  const id2 = t.generateCorrelationId();
  assert.ok(id1.startsWith('corr-'));
  assert.notEqual(id1, id2);
});

test('getMetricSummary aggregates by name and labels', () => {
  const t = makeTelemetry();
  t.recordDrift('T1');
  t.recordDrift('T1');
  t.recordDrift('T2');
  const summary = t.getMetricSummary();
  const t1Key = Object.keys(summary).find((k) => k.includes('drift_detected') && k.includes('T1'));
  assert.ok(t1Key);
  assert.equal(summary[t1Key!], 2);
});

test('clearForTesting resets state', () => {
  const t = makeTelemetry();
  t.record('error_count', 1, {});
  t.log({ action: 'TEST', result: 'OK' });
  t.clearForTesting();
  assert.equal(t.getMetrics().length, 0);
  assert.equal(t.getLogs().length, 0);
});
