import test from 'node:test';
import assert from 'node:assert/strict';
import { LargeTenantSyncService, type SyncPageSource, type PagedUser } from '../lib/sync/large-tenant-sync-service';

function makeSvc() { return new LargeTenantSyncService(); }

function makePagedSource(pages: PagedUser[][], totalEstimate?: number): SyncPageSource {
  let pageIndex = 0;
  return {
    fetchPage: async (cursor, pageSize) => {
      const idx = cursor != null ? parseInt(cursor) : pageIndex;
      const items = pages[idx] ?? [];
      const nextCursor = idx + 1 < pages.length ? String(idx + 1) : null;
      pageIndex = idx + 1;
      return { items: items.slice(0, pageSize), nextCursor, totalEstimate };
    },
    processItem: async (_item, _tenantId) => {},
  };
}

test('processes first page and saves checkpoint', async () => {
  const svc = makeSvc();
  const users: PagedUser[] = [{ userId: 'u1', userPrincipalName: 'u1@test.com', data: {} }];
  const source = makePagedSource([[...users]]);
  const result = await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  assert.equal(result.succeededCount, 1);
  assert.equal(result.chunkIndex, 1);
});

test('resumes from checkpoint on second run', async () => {
  const svc = makeSvc();
  const page1: PagedUser[] = [{ userId: 'u1', userPrincipalName: 'u1@test.com', data: {} }];
  const page2: PagedUser[] = [{ userId: 'u2', userPrincipalName: 'u2@test.com', data: {} }];
  const source = makePagedSource([page1, page2], 2);
  const r1 = await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  assert.equal(r1.hasMore, true);
  const r2 = await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  assert.equal(r2.succeededCount, 1);
});

test('sync complete when no more pages', async () => {
  const svc = makeSvc();
  const source = makePagedSource([[{ userId: 'u1', userPrincipalName: 'u1@test.com', data: {} }]]);
  const result = await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 5 }, source);
  assert.equal(result.hasMore, false);
  assert.equal(result.cursor, null);
  const progress = svc.getSyncProgress('T1', 'M365', 'USER_SYNC');
  assert.equal(progress?.status, 'COMPLETED');
});

test('getSyncProgress returns correct percent complete', async () => {
  const svc = makeSvc();
  const users: PagedUser[] = Array.from({ length: 50 }, (_, i) => ({ userId: `u${i}`, userPrincipalName: `u${i}@test.com`, data: {} }));
  const source = makePagedSource([users, []], 100);
  await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  const progress = svc.getSyncProgress('T1', 'M365', 'USER_SYNC');
  assert.equal(progress?.percentComplete, 50);
});

test('getSyncProgress returns null if no checkpoint', () => {
  const svc = makeSvc();
  assert.equal(svc.getSyncProgress('T1', 'UNKNOWN', 'SYNC'), null);
});

test('resetCheckpoint clears state', async () => {
  const svc = makeSvc();
  const source = makePagedSource([[{ userId: 'u1', userPrincipalName: 'u1@test.com', data: {} }]]);
  await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  svc.resetCheckpoint('T1', 'M365', 'USER_SYNC');
  assert.equal(svc.getSyncProgress('T1', 'M365', 'USER_SYNC'), null);
});

test('failed item does not abort whole chunk', async () => {
  const svc = makeSvc();
  const users: PagedUser[] = [
    { userId: 'u1', userPrincipalName: 'u1@test.com', data: {} },
    { userId: 'u2', userPrincipalName: 'u2@test.com', data: {} },
  ];
  let count = 0;
  const source: SyncPageSource = {
    fetchPage: async () => ({ items: users, nextCursor: null }),
    processItem: async (item) => { count++; if (item.userId === 'u1') throw new Error('PROCESS_FAILED'); },
  };
  const result = await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  assert.equal(result.failedCount, 1);
  assert.equal(result.succeededCount, 1);
  assert.equal(count, 2);
});

test('canResume is true after paused sync', async () => {
  const svc = makeSvc();
  const source = makePagedSource([[{ userId: 'u1', userPrincipalName: 'u1@test.com', data: {} }], [{ userId: 'u2', userPrincipalName: 'u2@test.com', data: {} }]]);
  await svc.runSyncChunk({ tenantId: 'T1', connectorId: 'M365', syncType: 'USER_SYNC', pageSize: 100, maxPagesPerRun: 1 }, source);
  const progress = svc.getSyncProgress('T1', 'M365', 'USER_SYNC');
  assert.equal(progress?.canResume, true);
});
