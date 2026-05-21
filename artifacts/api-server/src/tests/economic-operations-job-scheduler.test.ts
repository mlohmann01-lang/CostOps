import test from 'node:test';
import assert from 'node:assert/strict';
import { EconomicOperationsJobScheduler } from '../lib/economic-operations-job-scheduler';

function makeScheduler() { return new EconomicOperationsJobScheduler(); }

test('enqueue returns jobId', () => {
  const s = makeScheduler();
  const { jobId, deduplicated } = s.enqueue({ tenantId: 'T1', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:T1', payload: {}, idempotencyKey: 'idem-1' });
  assert.ok(jobId);
  assert.equal(deduplicated, false);
});

test('deduplication by idempotency key returns same jobId', () => {
  const s = makeScheduler();
  const r1 = s.enqueue({ tenantId: 'T1', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:T1', payload: {}, idempotencyKey: 'idem-dup' });
  const r2 = s.enqueue({ tenantId: 'T1', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:T1', payload: {}, idempotencyKey: 'idem-dup' });
  assert.equal(r1.jobId, r2.jobId);
  assert.equal(r2.deduplicated, true);
});

test('deduplication by jobKey and jobType', () => {
  const s = makeScheduler();
  const r1 = s.enqueue({ tenantId: 'T1', jobType: 'M365_DRIFT_SCAN', jobKey: 'drift:exec-1', payload: {} });
  const r2 = s.enqueue({ tenantId: 'T1', jobType: 'M365_DRIFT_SCAN', jobKey: 'drift:exec-1', payload: {} });
  assert.equal(r1.jobId, r2.jobId);
  assert.equal(r2.deduplicated, true);
});

test('job status transitions: QUEUED -> RUNNING -> SUCCEEDED', () => {
  const s = makeScheduler();
  const { jobId } = s.enqueue({ tenantId: 'T1', jobType: 'M365_CONNECTOR_HEALTH_CHECK', jobKey: 'health:T1', payload: {} });
  const job = s.getJob(jobId)!;
  assert.equal(job.status, 'QUEUED');

  const acquired = s.markRunning(jobId, 'worker-1');
  assert.equal(acquired, true);
  assert.equal(s.getJob(jobId)!.status, 'RUNNING');

  const completed = s.markSucceeded(jobId, { result: 'ok' });
  assert.equal(completed, true);
  assert.equal(s.getJob(jobId)!.status, 'SUCCEEDED');
});

test('job failure schedules retry when under max attempts', () => {
  const s = makeScheduler();
  const { jobId } = s.enqueue({ tenantId: 'T1', jobType: 'M365_READINESS_RECHECK', jobKey: 'ready:T1', payload: {} });
  s.markRunning(jobId, 'worker-1');
  s.markFailed(jobId, 'TRANSIENT_FAILURE');
  const job = s.getJob(jobId)!;
  assert.equal(job.status, 'RETRY_SCHEDULED');
  assert.equal(job.lastError, 'TRANSIENT_FAILURE');
});

test('job reaches FAILED after max attempts', () => {
  const s = makeScheduler();
  const { jobId } = s.enqueue({ tenantId: 'T1', jobType: 'M365_READINESS_RECHECK', jobKey: 'ready:T1:final', payload: {} });
  const job = s.getJob(jobId)!;
  // Override maxAttempts to 1 by running it once
  for (let i = 0; i < job.maxAttempts; i++) {
    s.markRunning(jobId, 'worker-1');
    s.markFailed(jobId, 'PERSISTENT_FAILURE');
  }
  assert.equal(s.getJob(jobId)!.status, 'FAILED');
});

test('markRunning on non-QUEUED job returns false', () => {
  const s = makeScheduler();
  const { jobId } = s.enqueue({ tenantId: 'T1', jobType: 'SERVICENOW_SYNC', jobKey: 'sn:T1', payload: {} });
  s.markRunning(jobId, 'worker-1');
  assert.equal(s.markRunning(jobId, 'worker-2'), false);
});

test('stale lock expiry resets to QUEUED', () => {
  const s = makeScheduler();
  const { jobId } = s.enqueue({ tenantId: 'T1', jobType: 'FLEXERA_SYNC', jobKey: 'flex:T1', payload: {} });
  s.markRunning(jobId, 'worker-1');
  const job = s.getJob(jobId)!;
  // Manually set lockExpiresAt to past
  (job as any).lockExpiresAt = new Date(Date.now() - 1000);
  s['jobs'].set(jobId, job);

  s.expireStaleJobs();
  assert.equal(s.getJob(jobId)!.status, 'QUEUED');
});

test('query jobs by tenantId filters correctly', () => {
  const s = makeScheduler();
  s.enqueue({ tenantId: 'T1', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:T1', payload: {} });
  s.enqueue({ tenantId: 'T2', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:T2', payload: {} });
  const t1Jobs = s.queryJobs({ tenantId: 'T1' });
  assert.equal(t1Jobs.length, 1);
  assert.equal(t1Jobs[0].tenantId, 'T1');
});

test('job is cancelled correctly', () => {
  const s = makeScheduler();
  const { jobId } = s.enqueue({ tenantId: 'T1', jobType: 'OUTCOME_LEDGER_RECONCILIATION', jobKey: 'recon:T1', payload: {} });
  assert.equal(s.markCancelled(jobId), true);
  assert.equal(s.getJob(jobId)!.status, 'CANCELLED');
  assert.equal(s.markCancelled(jobId), false);
});

test('getQueuedJobs returns only scheduled jobs', () => {
  const s = makeScheduler();
  const { jobId: j1 } = s.enqueue({ tenantId: 'T1', jobType: 'M365_READ_ONLY_SYNC', jobKey: 'sync:T1:q', payload: {} });
  s.enqueue({ tenantId: 'T1', jobType: 'M365_DRIFT_SCAN', jobKey: 'drift:T1:future', payload: {}, scheduledAt: new Date(Date.now() + 60000) });
  const queued = s.getQueuedJobs('T1');
  assert.ok(queued.some((j) => j.id === j1));
  assert.equal(queued.filter((j) => j.scheduledAt > new Date()).length, 0);
});
