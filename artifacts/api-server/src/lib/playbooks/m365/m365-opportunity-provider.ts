import type { OpportunitySourceProvider } from '../../opportunity-factory/opportunity-source-registry'
import type { RawOpportunity } from '../../opportunity-factory/opportunity-normalizer'
import { m365TrustService } from '../../connectors/m365/m365-trust'
import { runAllPlaybooks, recordM365OpportunitiesGenerated } from './m365-playbook-runtime'

function trustAllows(band: string) { return ['TRUSTED', 'HIGH', 'INVESTIGATE'].includes(String(band).toUpperCase()) }

export class M365OpportunityProvider implements OpportunitySourceProvider {
  source = 'M365_PLAYBOOK'
  async generateOpportunities(tenantId: string): Promise<RawOpportunity[]> {
    const trust = await m365TrustService.generateTrustReport(tenantId)
    const run = await runAllPlaybooks(tenantId)
    const raw = run.candidates.map((candidate) => {
      const blocked = !trustAllows(trust.globalTrustBand) || candidate.blockers.length > 0
      return { ...candidate.opportunityPayload, readiness: blocked ? 'BLOCKED' : candidate.opportunityPayload.readiness, trustScore: Math.max(0, Math.min(100, Math.round((candidate.opportunityPayload.trustScore ?? 60) * (trust.globalTrustScore / 100)))), evidence: [...(candidate.opportunityPayload.evidence ?? []), `trust:${trust.globalTrustBand}`, ...candidate.evidence], reasons: [...(candidate.opportunityPayload.reasons ?? []), ...candidate.trustRequirements, ...(blocked ? ['M365 trust gate blocked or candidate blockers present'] : [])] }
    })
    recordM365OpportunitiesGenerated(tenantId, raw.length)
    return raw
  }
}
