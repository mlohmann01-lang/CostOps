import test from 'node:test'
import assert from 'node:assert/strict'
import { listUnifiedEvents } from '../lib/events/evidence-timeline'
import { VendorChangePipelineService } from '../lib/vcde/vendor-change-pipeline-service'
import { VendorChangeRepository } from '../lib/vcde/vendor-change-repository'
import { VendorSignalIngestionService } from '../lib/vcde/vendor-signal-ingestion-service'
import { VendorSignalRepository } from '../lib/vcde/vendor-signal-repository'

test('pipeline ingests, classifies, assesses with tenant footprint, and emits platform events', () => {
  const repo = new VendorChangeRepository(); repo.clearForTests()
  const signalRepo = new VendorSignalRepository(); signalRepo.clearForTests()
  const pipeline = new VendorChangePipelineService(repo, new VendorSignalIngestionService(signalRepo))
  const result = pipeline.ingestSignal({ tenantId: 'tenant-vcde-pipeline', vendor: 'MICROSOFT', sourceType: 'MANUAL', sourceUrl: 'https://vendor.example/copilot', title: 'Copilot licensing terms update', rawText: 'Microsoft Copilot licensing terms update for enterprise packaging' })
  assert.equal(result.signal.signalState, 'NORMALIZED')
  assert.equal(result.change?.category, 'LICENSING_CHANGE')
  const assessed = pipeline.assess('tenant-vcde-pipeline', result.change!.id)
  assert.equal(assessed?.impact.impactConfidence, 'MEDIUM')
  assert.ok(assessed?.impact.affectedPlatforms?.includes('Copilot'))
  assert.equal(pipeline.health('tenant-vcde-pipeline').changesClassified, 1)
  assert.equal(listUnifiedEvents('tenant-vcde-pipeline').some((event) => event.eventType === 'VENDOR_CHANGE_DETECTED'), true)
})

test('impact assessment without tenant data is low confidence and safe', () => {
  const repo = new VendorChangeRepository(); repo.clearForTests()
  const change = repo.upsert('tenant-vcde-low', { id: 'vc-low', vendor: 'ADOBE', category: 'BUNDLE_CHANGE', title: 'Adobe packaging change', description: 'Adobe bundle packaging change', effectiveDate: '2026-06-01T00:00:00.000Z', sourceUrl: 'manual://adobe', impactSeverity: 'MEDIUM', detectedAt: '2026-06-01T00:00:00.000Z', affectedSpend: 0 })
  const pipeline = new VendorChangePipelineService(repo)
  const assessed = pipeline.assess('tenant-vcde-low', change.id)
  assert.equal(assessed?.impact.impactConfidence, 'LOW')
  assert.ok(assessed?.impact.impactReasons?.includes('tenant inventory unavailable'))
})
