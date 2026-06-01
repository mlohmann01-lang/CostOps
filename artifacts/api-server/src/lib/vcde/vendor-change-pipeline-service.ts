import { platformEventService } from '../events/platform-event-service'
import { OpportunityRepository } from '../opportunities/opportunity-repository'
import { runOpportunityFactory } from '../opportunity-factory/opportunity-factory-service'
import { assessVendorChangeImpact } from './impact-assessment-engine'
import { classifyVendorSignal } from './vendor-change-classifier'
import { VendorChangeRepository } from './vendor-change-repository'
import { VendorSignalIngestionService, type VendorSignalIngestInput } from './vendor-signal-ingestion-service'
import { VendorSignalRepository } from './vendor-signal-repository'

export class VendorChangePipelineService {
  constructor(
    private readonly changes = new VendorChangeRepository(),
    private readonly signals = new VendorSignalIngestionService(new VendorSignalRepository()),
    private readonly opportunities = new OpportunityRepository(),
  ) {}

  ingestSignal(input: VendorSignalIngestInput) {
    const signal = this.signals.ingest(input)
    if (signal.signalState === 'DUPLICATE') return { signal, duplicate: true, change: null }
    const draft = classifyVendorSignal(signal)
    const duplicate = this.changes.findDuplicate(input.tenantId, draft)
    const change = this.changes.upsert(input.tenantId, { ...draft, status: 'NEW', affectedSpend: defaultAffectedSpend(draft.vendor, draft.impactSeverity) })
    this.signals.get(input.tenantId, signal.signalId) && new VendorSignalRepository().setState(input.tenantId, signal.signalId, 'NORMALIZED')
    void platformEventService.recordOpportunityEvent(input.tenantId, duplicate ? 'VENDOR_CHANGE_DEDUPLICATED' : 'VENDOR_CHANGE_DETECTED', { entityType: 'VENDOR_CHANGE', entityId: change.id, title: duplicate ? 'Vendor change deduplicated' : 'Vendor change detected', description: change.title, sourceSystem: 'vendor-change-pipeline-service', evidenceRef: change.sourceUrl, metadata: { vendor: change.vendor, category: change.category, sourceSignalId: signal.signalId, classifierConfidence: change.classifierConfidence, classificationReasons: change.classificationReasons } }).catch(() => undefined)
    return { signal: new VendorSignalRepository().get(input.tenantId, signal.signalId) ?? signal, duplicate: Boolean(duplicate), change }
  }

  classify(tenantId: string, id: string) {
    const signal = this.signals.get(tenantId, id)
    if (signal) {
      const draft = classifyVendorSignal(signal)
      const change = this.changes.upsert(tenantId, { ...draft, status: 'NEW', affectedSpend: defaultAffectedSpend(draft.vendor, draft.impactSeverity) })
      new VendorSignalRepository().setState(tenantId, signal.signalId, 'NORMALIZED')
      void platformEventService.recordOpportunityEvent(tenantId, 'VENDOR_CHANGE_DETECTED', { entityType: 'VENDOR_CHANGE', entityId: change.id, title: 'Vendor change detected', description: change.title, sourceSystem: 'vendor-change-classifier', evidenceRef: change.sourceUrl, metadata: { sourceSignalId: signal.signalId, classificationReasons: change.classificationReasons } }).catch(() => undefined)
      return { signal, change }
    }
    const change = this.changes.get(tenantId, id)
    if (!change) return null
    return { signal: change.sourceSignalId ? this.signals.get(tenantId, change.sourceSignalId) : null, change }
  }

  assess(tenantId: string, id: string) {
    const change = this.changes.get(tenantId, id)
    if (!change) return null
    const impact = assessVendorChangeImpact(change, tenantId)
    const updated = this.changes.update(tenantId, id, { status: Number(impact.estimatedMonthlyImpact ?? impact.monthlyCostDelta) > 0 ? 'IMPACTED' : 'ASSESSED', affectedSpend: impact.affectedSpend })
    return { change: updated ?? change, impact }
  }

  async promoteToOpportunity(tenantId: string, id: string) {
    const change = this.changes.get(tenantId, id)
    if (!change) return null
    const impact = assessVendorChangeImpact(change, tenantId)
    const factory = await runOpportunityFactory(tenantId)
    const opportunities = this.opportunities.getBySource(tenantId, 'VENDOR_CHANGE').filter((opportunity) => opportunity.sourceReferenceId === change.id)
    this.changes.update(tenantId, id, { status: 'ACTIONED', affectedSpend: impact.affectedSpend, generatedOpportunityCount: opportunities.length })
    return { change: this.changes.get(tenantId, id), impact, opportunities, factorySummary: factory.summary }
  }

  health(tenantId: string) {
    const signals = this.signals.list(tenantId)
    const changes = this.changes.list(tenantId)
    const opportunities = this.opportunities.getBySource(tenantId, 'VENDOR_CHANGE')
    const duplicateSignals = signals.filter((signal) => signal.signalState === 'DUPLICATE').length
    const highImpactChanges = changes.filter((change) => change.impactSeverity === 'HIGH' || change.impactSeverity === 'CRITICAL').length
    const changesClassified = changes.filter((change) => Boolean(change.classifierConfidence) || Boolean(change.sourceSignalId)).length
    const lastIngestionRun = signals[0]?.detectedAt ?? null
    const state = signals.length === 0 ? 'STALE' : duplicateSignals > signals.length / 2 ? 'DEGRADED' : 'HEALTHY'
    return { state, signalsIngested: signals.length, duplicateSignals, changesClassified, highImpactChanges, opportunitiesPromoted: opportunities.length, lastIngestionRun, classifierHealth: 'HEALTHY' }
  }

  listSignals(tenantId: string) { return this.signals.list(tenantId) }
  getSignal(tenantId: string, signalId: string) { return this.signals.get(tenantId, signalId) }
}

function defaultAffectedSpend(vendor: string, severity: string) {
  const base = vendor === 'MICROSOFT' ? 32000 : vendor === 'AWS' ? 48000 : vendor === 'SNOWFLAKE' ? 11000 : vendor === 'SALESFORCE' ? 22000 : vendor === 'ADOBE' ? 7000 : 10000
  return severity === 'CRITICAL' ? base * 2 : severity === 'HIGH' ? base : Math.round(base * 0.75)
}

export const vendorChangePipelineService = new VendorChangePipelineService()
