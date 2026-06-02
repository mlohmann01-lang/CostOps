import test from 'node:test'
import assert from 'node:assert/strict'
import { executiveValueService } from '../lib/executive-value/executive-value-service'
import { evidencePackService } from '../lib/evidence-pack/evidence-pack-service'
import { platformEventService } from '../lib/events/platform-event-service'
import { outcomeProofService } from '../lib/outcomes/outcome-proof-service'

test('executive value service returns tenant-scoped summary and emits viewed event', async () => {
  const tenantId = 'tenant-executive-service'
  outcomeProofService.clearForTests()
  await outcomeProofService.upsertProof(tenantId, { outcomeId: 'outcome-service', projectedMonthlySavings: 200, projectedAnnualSavings: 2400, proofState: 'PROJECTED', confidenceBand: 'MEDIUM' })
  const summary = await executiveValueService.getExecutiveValueSummary(tenantId)
  assert.equal(summary.tenantId, tenantId)
  assert.equal(summary.valueMetrics.projectedMonthlySavings, 200)
  const events = await platformEventService.listEvents(tenantId)
  assert.ok(events.some((event) => event.type === 'EXECUTIVE_VALUE_SUMMARY_VIEWED'))
})

test('executive value evidence pack generation delegates to Evidence Pack Authority', async () => {
  const tenantId = 'tenant-executive-pack'
  evidencePackService.clearForTests()
  const pack = await executiveValueService.generateExecutiveEvidencePack(tenantId, 'tester')
  assert.equal(pack.scope, 'TENANT')
  assert.equal(evidencePackService.get(tenantId, pack.evidencePackId)?.evidencePackId, pack.evidencePackId)
  assert.equal(evidencePackService.get('other-tenant', pack.evidencePackId), null)
  const events = await platformEventService.listEvents(tenantId)
  assert.ok(events.some((event) => event.type === 'EXECUTIVE_VALUE_EVIDENCE_PACK_REQUESTED'))
  assert.ok(events.some((event) => event.type === 'EXECUTIVE_VALUE_EVIDENCE_PACK_GENERATED'))
})
