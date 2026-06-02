import { platformEventService } from '../events/platform-event-service'
import { evidencePackService, type EvidencePackService } from '../evidence-pack/evidence-pack-service'
import { aggregateExecutiveValue } from './executive-value-aggregator'
import { buildExecutiveValueNarrative } from './executive-value-narrative'
import type { ExecutiveValueSummary } from './executive-value-types'

export class ExecutiveValueService {
  constructor(private readonly packService: EvidencePackService = evidencePackService) {}

  async getExecutiveValueSummary(tenantId: string): Promise<ExecutiveValueSummary> {
    const aggregate = await aggregateExecutiveValue(tenantId)
    const summary = { ...aggregate, narrative: buildExecutiveValueNarrative(aggregate) }
    await platformEventService.recordSystemEvent(tenantId, 'EXECUTIVE_VALUE_SUMMARY_VIEWED', { entityType: 'EXECUTIVE_VALUE_SUMMARY', entityId: tenantId, sourceSystem: 'executive-value-engine', metadata: { projectedMonthlySavings: summary.valueMetrics.projectedMonthlySavings, verifiedMonthlySavings: summary.valueMetrics.verifiedMonthlySavings } }).catch(() => undefined)
    return summary
  }

  async getExecutiveValueByDomain(tenantId: string) { return (await this.getExecutiveValueSummary(tenantId)).byDomain }
  async getTopValueDrivers(tenantId: string, limit = 5) { return (await this.getExecutiveValueSummary(tenantId)).topValueDrivers.slice(0, limit) }
  async getExecutiveBlockers(tenantId: string) { return (await this.getExecutiveValueSummary(tenantId)).blockers }

  async generateExecutiveEvidencePack(tenantId: string, generatedBy = 'executive-value') {
    await platformEventService.recordSystemEvent(tenantId, 'EXECUTIVE_VALUE_EVIDENCE_PACK_REQUESTED', { entityType: 'EVIDENCE_PACK', entityId: tenantId, sourceSystem: 'executive-value-engine', metadata: { scope: 'TENANT' } }).catch(() => undefined)
    const pack = await this.packService.generate({ tenantId, scope: 'TENANT', generatedBy })
    await platformEventService.recordSystemEvent(tenantId, 'EXECUTIVE_VALUE_EVIDENCE_PACK_GENERATED', { entityType: 'EVIDENCE_PACK', entityId: pack.evidencePackId, sourceSystem: 'executive-value-engine', metadata: { scope: pack.scope, completeness: pack.metrics.completeness } }).catch(() => undefined)
    return pack
  }
}

export const executiveValueService = new ExecutiveValueService()
