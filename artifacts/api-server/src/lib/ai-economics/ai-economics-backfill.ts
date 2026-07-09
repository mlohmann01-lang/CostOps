import type { AIEconomicsAuthorityService } from './ai-economics-service';

/**
 * Workstream 16: canonical AI Economic Profile examples backed by existing AI investments /
 * AI workflows / AI attributions already present in the tenant. No fabricated telemetry —
 * spend and value fields are left at zero unless real evidence is supplied by the caller.
 */
export const AI_ECONOMICS_CANONICAL_PROFILES = [
  { profileName: 'Microsoft Copilot' },
  { profileName: 'GitHub Copilot' },
  { profileName: 'OpenAI' },
  { profileName: 'Claude Teams' },
  { profileName: 'Internal AI Platform' },
] as const;

export interface AIInvestmentLookup { listInvestments(tenantId: string): Promise<Array<{ id: string; name?: string }>> }

export async function backfillCanonicalAIEconomicProfiles(
  tenantId: string,
  service: AIEconomicsAuthorityService,
  investmentLookup?: AIInvestmentLookup,
  workflowId?: string,
) {
  const investments = investmentLookup ? await investmentLookup.listInvestments(tenantId) : [];
  return Promise.all(AI_ECONOMICS_CANONICAL_PROFILES.map(async (canonical) => {
    const matchedInvestment = investments.find((i) => (i.name ?? '').toLowerCase().includes(canonical.profileName.toLowerCase()));
    return service.createEconomicProfile({
      tenantId,
      workflowId,
      investmentId: matchedInvestment?.id,
      profileName: canonical.profileName,
      metadata: matchedInvestment ? { aiInvestmentId: matchedInvestment.id } : {},
    });
  }));
}
