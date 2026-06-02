import type { OpportunitySourceProvider } from '../../opportunity-factory/opportunity-source-registry'
import type { RawOpportunity } from '../../opportunity-factory/opportunity-normalizer'
import { m365TrustService } from '../../connectors/m365/m365-trust'
import { m365SnapshotRepository } from '../../connectors/m365/m365-snapshot-repository'
import { classifyM365ExecutionSafety } from './m365-execution-safety-classifier'
import { runAllPlaybooks, recordM365OpportunitiesGenerated } from './m365-playbook-runtime'
import { readinessForAssessment, withEconomicAssessment } from './m365-playbook-utils'

function trustAllowsOpportunity(band: string) { return ['TRUSTED', 'HIGH', 'INVESTIGATE'].includes(String(band).toUpperCase()) }

export class M365OpportunityProvider implements OpportunitySourceProvider {
  source = 'M365_PLAYBOOK'
  async generateOpportunities(tenantId: string): Promise<RawOpportunity[]> {
    const trust = await m365TrustService.generateTrustReport(tenantId)
    const run = await runAllPlaybooks(tenantId)
    const snapshot = m365SnapshotRepository.getLatest(tenantId)
    const raw = run.candidates.map((candidate) => {
      const trustedEnoughToShow = trustAllowsOpportunity(trust.globalTrustBand)
      const assessment = classifyM365ExecutionSafety({ playbookId: candidate.playbookId, entityId: candidate.entityId, entityType: candidate.entityType, projectedMonthlySavings: candidate.projectedMonthlySavings, savingsConfidence: candidate.savingsConfidence, evidenceQuality: candidate.evidenceQuality, evidenceReasons: candidate.economicAssessment.evidenceReasons, evidence: candidate.evidence, blockers: candidate.blockers, costEstimates: candidate.costEstimates, entitlementRelationships: candidate.entitlementRelationships }, { snapshot, trust })
      const trustBlocked = !trustedEnoughToShow
      const finalAssessment = trustBlocked ? { ...assessment, executionSafety: 'BLOCKED' as const, productionReadiness: 'NOT_READY' as const, requiredHumanReview: true, allowedNextStep: 'BLOCK' as const, blockers: Array.from(new Set([...assessment.blockers, 'M365 trust gate blocked'])), safetyReasons: [...assessment.safetyReasons, 'Global M365 trust is LOW_CONFIDENCE or BLOCKED.'] } : assessment
      const readiness = readinessForAssessment(finalAssessment)
      const payload = withEconomicAssessment({ ...candidate.opportunityPayload, readiness, trustScore: Math.max(0, Math.min(100, Math.round((candidate.opportunityPayload.trustScore ?? 60) * (trust.globalTrustScore / 100)))), evidence: [...(candidate.opportunityPayload.evidence ?? []), `trust:${trust.globalTrustBand}`, `trustGate:${finalAssessment.trustGateResult ?? 'PENDING_TRUST_GATE'}`, ...candidate.evidence], reasons: [...(candidate.opportunityPayload.reasons ?? []), ...candidate.trustRequirements, ...(finalAssessment.trustGateReasons ?? []), ...(trustBlocked ? ['M365 trust gate blocked or candidate blockers present'] : [])] }, finalAssessment)
      return payload
    })
    recordM365OpportunitiesGenerated(tenantId, raw.length)
    return raw
  }
}
