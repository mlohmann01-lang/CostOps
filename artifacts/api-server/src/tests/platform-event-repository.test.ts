import test from 'node:test'
import assert from 'node:assert/strict'
import { PlatformEventRepository } from '../lib/events/platform-event-repository'

const event = (tenantId: string, eventId: string, occurredAt: string, category: any = 'SYSTEM') => ({ eventId, tenantId, category, type: category === 'APPROVAL' ? 'APPROVAL_SUBMITTED' : 'RUNTIME_RECOVERED', severity: 'INFO' as const, title: eventId, sourceSystem: 'test', entityType: 'TEST', entityId: eventId, occurredAt })

test('platform event repository is append-only and tenant scoped', async () => {
  const repo = new PlatformEventRepository()
  await repo.appendEvent(event('tenant-a4-repo-a', 'event-a', '2026-06-01T00:00:00.000Z'))
  await assert.rejects(() => repo.appendEvent(event('tenant-a4-repo-a', 'event-a', '2026-06-01T00:01:00.000Z')), /PLATFORM_EVENT_IMMUTABLE_DUPLICATE/)
  assert.equal((await repo.listEvents('tenant-a4-repo-a')).length, 1)
  assert.equal((await repo.listEvents('tenant-a4-repo-b')).length, 0)
})

test('platform event repository orders and filters by category entity and time range', async () => {
  const repo = new PlatformEventRepository()
  await repo.appendEvents([
    event('tenant-a4-repo-filter', 'event-1', '2026-06-01T00:00:00.000Z', 'APPROVAL'),
    event('tenant-a4-repo-filter', 'event-2', '2026-06-01T00:02:00.000Z', 'SYSTEM'),
  ])
  assert.deepEqual((await repo.listEvents('tenant-a4-repo-filter')).map((row) => row.eventId), ['event-2', 'event-1'])
  assert.equal((await repo.listByCategory('tenant-a4-repo-filter', 'APPROVAL')).length, 1)
  assert.equal((await repo.listByEntity('tenant-a4-repo-filter', 'TEST', 'event-2')).at(0)?.eventId, 'event-2')
  assert.equal((await repo.listByTimeRange('tenant-a4-repo-filter', '2026-06-01T00:01:00.000Z', '2026-06-01T00:03:00.000Z')).length, 1)
})
