import type { AIInitiativePortfolioService } from './ai-initiative-portfolio-service';
import type { AIInitiativeType } from './ai-initiative-portfolio-types';

/**
 * Workstream 14: canonical AI Initiative examples backed by existing AI workflows / AI
 * attributions / AI economic profiles already present in the tenant. No fabricated telemetry —
 * linkage confidence is left undefined unless real evidence is supplied by the caller.
 */
export const AI_INITIATIVE_CANONICAL_PORTFOLIO = [
  { name: 'Microsoft Copilot Rollout', initiativeType: 'COPILOT' as AIInitiativeType, matches: ['microsoft copilot'] },
  { name: 'GitHub Copilot Adoption', initiativeType: 'DEVELOPER_PRODUCTIVITY' as AIInitiativeType, matches: ['github copilot'] },
  { name: 'Knowledge Assistant', initiativeType: 'KNOWLEDGE' as AIInitiativeType, matches: ['knowledge'] },
  { name: 'Customer Support Agent', initiativeType: 'AGENT' as AIInitiativeType, matches: ['support', 'customer'] },
  { name: 'Document Automation', initiativeType: 'AUTOMATION' as AIInitiativeType, matches: ['document'] },
  { name: 'Internal Search Assistant', initiativeType: 'GEN_AI' as AIInitiativeType, matches: ['search', 'internal ai platform'] },
] as const;

export interface AIEconomicProfileLookup { listEconomicProfiles(tenantId: string): Promise<Array<{ id: string; profileName: string }>> }

export async function backfillCanonicalAIInitiatives(
  tenantId: string,
  service: AIInitiativePortfolioService,
  economicProfileLookup?: AIEconomicProfileLookup,
  sourceSystem = 'CERTEN',
) {
  const profiles = economicProfileLookup ? await economicProfileLookup.listEconomicProfiles(tenantId) : [];
  return Promise.all(AI_INITIATIVE_CANONICAL_PORTFOLIO.map(async (canonical) => {
    const matchedProfile = profiles.find((p) => canonical.matches.some((m) => p.profileName.toLowerCase().includes(m)));
    const initiative = await service.createInitiative({
      tenantId,
      name: canonical.name,
      initiativeType: canonical.initiativeType,
      status: 'ACTIVE',
      sourceSystem,
      sourceReference: canonical.name,
      metadata: matchedProfile ? { aiEconomicProfileId: matchedProfile.id } : {},
    });
    if (matchedProfile) await service.linkEconomics(tenantId, initiative.id, matchedProfile.id);
    return initiative;
  }));
}
