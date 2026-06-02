import { platformEventService } from '../events/platform-event-service'
import { outcomeProofService } from '../outcomes/outcome-proof-service'
import { m365TrustService } from '../connectors/m365/m365-trust'
import { EvidencePackBuilder, evidencePackBuilder } from './evidence-pack-builder'
import { evidencePackRepository, type EvidencePackRepository } from './evidence-pack-repository'
import { generateEvidencePackAuditBundle, generateEvidencePackJson, generateEvidencePackPdf } from './evidence-pack-generator'
import type { EvidencePackGenerateInput, EvidencePackScope } from './evidence-pack-types'

export class EvidencePackService {
  constructor(private readonly repo: EvidencePackRepository = evidencePackRepository, private readonly builder: EvidencePackBuilder = evidencePackBuilder) {}

  async generate(input: EvidencePackGenerateInput) {
    const scope = input.scope ?? 'TENANT'
    await platformEventService.recordSystemEvent(input.tenantId, 'EVIDENCE_PACK_GENERATION_STARTED', { entityType: 'EVIDENCE_PACK', entityId: `${scope}:${input.targetId ?? input.tenantId}`, sourceSystem: 'evidence-pack-authority', metadata: { scope, targetId: input.targetId } }).catch(() => undefined)
    try {
      const pack = scope === 'OPPORTUNITY' ? await this.builder.buildOpportunityEvidencePack(input) : scope === 'EXECUTION' ? await this.builder.buildExecutionEvidencePack(input) : scope === 'OUTCOME' ? await this.builder.buildOutcomeEvidencePack(input) : await this.builder.buildTenantEvidencePack({ ...input, scope: scope as EvidencePackScope })
      this.repo.save(pack)
      await platformEventService.recordSystemEvent(input.tenantId, 'EVIDENCE_PACK_GENERATION_COMPLETED', { entityType: 'EVIDENCE_PACK', entityId: pack.evidencePackId, sourceSystem: 'evidence-pack-authority', metadata: { scope: pack.scope, completeness: pack.metrics.completeness } }).catch(() => undefined)
      return pack
    } catch (error) {
      await platformEventService.recordSystemEvent(input.tenantId, 'EVIDENCE_PACK_GENERATION_FAILED', { entityType: 'EVIDENCE_PACK', entityId: `${scope}:${input.targetId ?? input.tenantId}`, sourceSystem: 'evidence-pack-authority', metadata: { error: error instanceof Error ? error.message : String(error) } }).catch(() => undefined)
      throw error
    }
  }

  list(tenantId: string) { return this.repo.list(tenantId) }
  get(tenantId: string, evidencePackId: string) { return this.repo.get(tenantId, evidencePackId) }
  json(tenantId: string, evidencePackId: string) { const pack = this.requirePack(tenantId, evidencePackId); return generateEvidencePackJson(pack) }
  pdf(tenantId: string, evidencePackId: string) { const pack = this.requirePack(tenantId, evidencePackId); void this.emitExport(tenantId, pack.evidencePackId, 'PDF'); return generateEvidencePackPdf(pack) }
  async audit(tenantId: string, evidencePackId: string) { const pack = this.requirePack(tenantId, evidencePackId); void this.emitExport(tenantId, pack.evidencePackId, 'AUDIT'); return generateEvidencePackAuditBundle({ pack, evidence: pack.sections, events: await platformEventService.listEvents(tenantId, { limit: 1000 }), trust: await m365TrustService.generateTrustReport(tenantId).catch(() => null), outcomes: await outcomeProofService.listProofs(tenantId, { limit: 500 }) }) }
  private requirePack(tenantId: string, evidencePackId: string) { const pack = this.repo.get(tenantId, evidencePackId); if (!pack) throw new Error('EVIDENCE_PACK_NOT_FOUND'); return pack }
  private emitExport(tenantId: string, evidencePackId: string, format: string) { return platformEventService.recordSystemEvent(tenantId, 'EVIDENCE_PACK_EXPORTED', { entityType: 'EVIDENCE_PACK', entityId: evidencePackId, sourceSystem: 'evidence-pack-authority', metadata: { format } }).catch(() => undefined) }
  clearForTests() { this.repo.clearForTests() }
}
export const evidencePackService = new EvidencePackService()
