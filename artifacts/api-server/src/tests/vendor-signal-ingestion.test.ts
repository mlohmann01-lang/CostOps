import test from 'node:test'
import assert from 'node:assert/strict'
import { listUnifiedEvents } from '../lib/events/evidence-timeline'
import { VendorSignalIngestionService } from '../lib/vcde/vendor-signal-ingestion-service'

test('ingests vendor signals, hashes source evidence, dedupes by hash, and isolates tenants', () => {
  const service = new VendorSignalIngestionService()
  service.clearForTests()
  const input: any = { tenantId: 'tenant-vcde-ingest', vendor: 'MICROSOFT', sourceType: 'MANUAL', sourceUrl: 'https://vendor.example/copilot', title: 'Copilot price increase', rawText: 'Microsoft Copilot price increase for enterprise seats' }
  const first = service.ingest(input)
  const second = service.ingest(input)
  assert.equal(first.signalState, 'NEW')
  assert.equal(second.signalState, 'DUPLICATE')
  assert.equal(second.duplicateOfSignalId, first.signalId)
  assert.equal(service.list('tenant-vcde-ingest').length, 2)
  assert.equal(service.list('other-tenant').length, 0)
  assert.equal(listUnifiedEvents('tenant-vcde-ingest').some((event) => event.eventType === 'VENDOR_SIGNAL_INGESTED'), true)
})
