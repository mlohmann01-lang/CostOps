import { createHash } from 'node:crypto'
import { platformEventService } from '../events/platform-event-service'
import type { Vendor } from './vendor-change-types'
import { VendorSignalRepository } from './vendor-signal-repository'
import type { VendorSignal, VendorSignalSourceType } from './vendor-signal-types'

export type VendorSignalIngestInput = { tenantId: string; vendor: Vendor; sourceType?: VendorSignalSourceType; sourceUrl: string; title: string; rawText: string; publishedAt?: string; detectedAt?: string }

export function vendorSignalHash(input: Pick<VendorSignalIngestInput, 'vendor' | 'sourceUrl' | 'title' | 'rawText'>) {
  return createHash('sha256').update([input.vendor, input.sourceUrl, input.title, input.rawText].map((value) => String(value ?? '').trim().toLowerCase()).join('|')).digest('hex')
}

export class VendorSignalIngestionService {
  constructor(private readonly repository = new VendorSignalRepository()) {}
  ingest(input: VendorSignalIngestInput) {
    const detectedAt = input.detectedAt ?? new Date().toISOString()
    const hash = vendorSignalHash(input)
    const duplicate = this.repository.getByHash(input.tenantId, hash)
    if (duplicate) {
      const signal: VendorSignal = { ...input, sourceType: input.sourceType ?? 'MANUAL', detectedAt, hash, signalId: `vsig-dup-${hash.slice(0, 12)}-${Date.now()}`, signalState: 'DUPLICATE', duplicateOfSignalId: duplicate.signalId }
      void platformEventService.recordOpportunityEvent(input.tenantId, 'VENDOR_CHANGE_DEDUPLICATED', { entityType: 'VENDOR_SIGNAL', entityId: signal.signalId, title: 'Vendor signal deduplicated', description: signal.title, sourceSystem: 'vendor-signal-ingestion-service', evidenceRef: signal.sourceUrl, metadata: { vendor: signal.vendor, duplicateOfSignalId: duplicate.signalId } }).catch(() => undefined)
      return this.repository.upsert(signal)
    }
    const signal: VendorSignal = { ...input, sourceType: input.sourceType ?? 'MANUAL', detectedAt, hash, signalId: `vsig-${hash.slice(0, 16)}`, signalState: 'NEW' }
    this.repository.upsert(signal)
    void platformEventService.recordOpportunityEvent(input.tenantId, 'VENDOR_SIGNAL_INGESTED', { entityType: 'VENDOR_SIGNAL', entityId: signal.signalId, title: 'Vendor signal ingested', description: signal.title, sourceSystem: 'vendor-signal-ingestion-service', evidenceRef: signal.sourceUrl, metadata: { vendor: signal.vendor, hash: signal.hash } }).catch(() => undefined)
    return signal
  }
  list(tenantId: string) { return this.repository.list(tenantId) }
  get(tenantId: string, signalId: string) { return this.repository.get(tenantId, signalId) }
  clearForTests() { this.repository.clearForTests() }
}
