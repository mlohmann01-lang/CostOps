import test from 'node:test'
import assert from 'node:assert/strict'
import { PlatformEventService } from '../lib/events/platform-event-service'

test('normalizes unified governance events into canonical platform events', () => {
  const service = new PlatformEventService()
  const event = service.normalizeExternalEvent({ eventId: 'wf-1:APPROVAL_GRANTED', tenantId: 'tenant-a4-norm', entityType: 'APPROVAL_WORKFLOW', entityId: 'wf-1', eventType: 'APPROVAL_GRANTED', eventCategory: 'APPROVAL', actorId: 'owner', actorRole: 'OWNER', eventReason: 'Approved', beforeState: 'PENDING', afterState: 'APPROVED', evidenceSnapshot: {}, sourceSystem: 'approval-workflow-engine', createdAt: '2026-06-01T00:00:00.000Z' })
  assert.equal(event.category, 'APPROVAL')
  assert.equal(event.type, 'APPROVAL_GRANTED')
  assert.equal(event.severity, 'INFO')
})

test('recordNormalizedEvent canonicalizes aliases at write time', async () => {
  const service = new PlatformEventService()
  const event = await service.recordNormalizedEvent({ eventId: 'wf-2:APPROVAL_GRANTED', tenantId: 'tenant-a4-norm-record', entityType: 'APPROVAL_WORKFLOW', entityId: 'wf-2', eventType: 'APPROVAL_GRANTED', eventCategory: 'APPROVAL', actorId: 'owner', actorRole: 'OWNER', eventReason: 'Approved', beforeState: 'PENDING', afterState: 'APPROVED', evidenceSnapshot: {}, sourceSystem: 'approval-workflow-engine', createdAt: '2026-06-01T00:00:00.000Z' })
  assert.equal(event.type, 'APPROVAL_APPROVED')
})
