import test from 'node:test';
import assert from 'node:assert/strict';
import { DistributedLockService } from '../lib/distributed-lock-service';

function makeSvc() { return new DistributedLockService(); }

const baseKey = { tenantId: 'T1', resourceType: 'm365:user', resourceId: 'user-1:license-removal', lockType: 'EXECUTION' as const };

test('acquire lock succeeds when no lock held', async () => {
  const svc = makeSvc();
  const result = await svc.acquireLock(baseKey, 'worker-1', 5000);
  assert.equal(result.acquired, true);
  if (result.acquired) assert.ok(result.lockId);
});

test('second acquire fails when lock held', async () => {
  const svc = makeSvc();
  await svc.acquireLock(baseKey, 'worker-1', 5000);
  const result = await svc.acquireLock(baseKey, 'worker-2', 5000);
  assert.equal(result.acquired, false);
  if (!result.acquired) assert.equal(result.reason, 'LOCK_HELD');
});

test('release lock allows re-acquire', async () => {
  const svc = makeSvc();
  const r1 = await svc.acquireLock(baseKey, 'worker-1', 5000);
  assert.ok(r1.acquired);
  if (!r1.acquired) return;
  await svc.releaseLock(r1.lockId, 'worker-1');
  const r2 = await svc.acquireLock(baseKey, 'worker-2', 5000);
  assert.equal(r2.acquired, true);
});

test('release by wrong holder returns false', async () => {
  const svc = makeSvc();
  const r1 = await svc.acquireLock(baseKey, 'worker-1', 5000);
  if (!r1.acquired) return;
  const released = await svc.releaseLock(r1.lockId, 'wrong-worker');
  assert.equal(released, false);
});

test('stale lock expires and allows re-acquire', async () => {
  const svc = makeSvc();
  const r1 = await svc.acquireLock(baseKey, 'worker-1', 1);
  if (!r1.acquired) return;
  await new Promise((r) => setTimeout(r, 10));
  const r2 = await svc.acquireLock(baseKey, 'worker-2', 5000);
  assert.equal(r2.acquired, true);
});

test('renew lock extends expiry', async () => {
  const svc = makeSvc();
  const r1 = await svc.acquireLock(baseKey, 'worker-1', 5000);
  if (!r1.acquired) return;
  const renewed = await svc.renewLock(r1.lockId, 10000);
  assert.equal(renewed, true);
});

test('renew non-existent lock returns false', async () => {
  const svc = makeSvc();
  const renewed = await svc.renewLock('fake-lock-id', 10000);
  assert.equal(renewed, false);
});

test('isLocked returns true when lock held', async () => {
  const svc = makeSvc();
  await svc.acquireLock(baseKey, 'worker-1', 5000);
  assert.equal(await svc.isLocked(baseKey), true);
});

test('isLocked returns false after release', async () => {
  const svc = makeSvc();
  const r1 = await svc.acquireLock(baseKey, 'worker-1', 5000);
  if (!r1.acquired) return;
  await svc.releaseLock(r1.lockId, 'worker-1');
  assert.equal(await svc.isLocked(baseKey), false);
});

test('tenant-scoped keys do not conflict across tenants', async () => {
  const svc = makeSvc();
  const k1 = { ...baseKey, tenantId: 'T1' };
  const k2 = { ...baseKey, tenantId: 'T2' };
  const r1 = await svc.acquireLock(k1, 'worker-1', 5000);
  const r2 = await svc.acquireLock(k2, 'worker-2', 5000);
  assert.equal(r1.acquired, true);
  assert.equal(r2.acquired, true);
});

test('withLock acquires and releases automatically', async () => {
  const svc = makeSvc();
  let ran = false;
  await svc.withLock(baseKey, 'worker-1', 5000, async () => {
    ran = true;
    assert.equal(await svc.isLocked(baseKey), true);
    return {};
  });
  assert.equal(ran, true);
  assert.equal(await svc.isLocked(baseKey), false);
});

test('withLock throws when lock unavailable', async () => {
  const svc = makeSvc();
  await svc.acquireLock(baseKey, 'worker-1', 5000);
  await assert.rejects(
    () => svc.withLock(baseKey, 'worker-2', 5000, async () => ({})),
    /LOCK_UNAVAILABLE/,
  );
});

test('static M365 lock key builders produce scoped keys', () => {
  const execKey = DistributedLockService.buildM365ExecutionKey('T1', 'user-123', 'license-removal');
  assert.equal(execKey.tenantId, 'T1');
  assert.equal(execKey.lockType, 'EXECUTION');

  const syncKey = DistributedLockService.buildSyncKey('T1');
  assert.equal(syncKey.lockType, 'SYNC');

  const recKey = DistributedLockService.buildRecommendationKey('T1');
  assert.equal(recKey.lockType, 'RECOMMENDATION_GENERATION');
});
