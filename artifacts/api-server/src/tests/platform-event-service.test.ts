import test from 'node:test'
import assert from 'node:assert/strict'
import { PlatformEventService } from '../lib/events/platform-event-service'

test('platform event service records canonical category helpers', async () => {
  const service = new PlatformEventService()
  const approval = await service.recordApprovalEvent('tenant-a4-service', 'APPROVAL_GRANTED', { eventId: 'approval-granted-a4', entityType: 'APPROVAL_WORKFLOW', entityId: 'wf-a4', sourceSystem: 'test' })
  assert.equal(approval.type, 'APPROVAL_APPROVED')
  const outcome = await service.recordOutcomeEvent('tenant-a4-service', 'OUTCOME_PROOF_VERIFIED', { eventId: 'outcome-proof-a4', entityType: 'OUTCOME_PROOF', entityId: 'proof-a4', sourceSystem: 'test' })
  assert.equal(outcome.category, 'OUTCOME')
  const rows = await service.listByEntity('tenant-a4-service', 'APPROVAL_WORKFLOW', 'wf-a4')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].category, 'APPROVAL')
})

test('platform event service has no mutation methods beyond append/record', () => {
  const service = new PlatformEventService() as any
  assert.equal(typeof service.updateEvent, 'undefined')
  assert.equal(typeof service.deleteEvent, 'undefined')
})
