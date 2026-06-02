import test from 'node:test'
import assert from 'node:assert/strict'
import { EvidencePackService } from '../lib/evidence-pack/evidence-pack-service'
import { EvidencePackRepository } from '../lib/evidence-pack/evidence-pack-repository'
import { platformEventService } from '../lib/events/platform-event-service'

test('service generates stores tenant-scoped pack and emits events', async () => {
  const service = new EvidencePackService(new EvidencePackRepository())
  const pack = await service.generate({ tenantId: 'tenant-service', scope: 'TENANT', generatedBy: 'tester' })
  assert.equal(service.get('tenant-service', pack.evidencePackId)?.evidencePackId, pack.evidencePackId)
  assert.equal(service.get('other-tenant', pack.evidencePackId), null)
  const events = await platformEventService.listEvents('tenant-service')
  assert.ok(events.some((event) => event.type === 'EVIDENCE_PACK_GENERATION_STARTED'))
  assert.ok(events.some((event) => event.type === 'EVIDENCE_PACK_GENERATION_COMPLETED'))
})
