import type { AICapitalAllocationAuthorityService } from './ai-capital-allocation-service';

/**
 * Workstream 15: canonical AI Capital Allocation examples backed by existing AI Initiative
 * Portfolio evaluations. No fabricated telemetry — allocations are evaluated purely from
 * already-linked portfolio, economics, and attribution evidence.
 */
export const AI_CAPITAL_ALLOCATION_CANONICAL_NAMES = [
  'Microsoft Copilot Rollout',
  'GitHub Copilot Adoption',
  'Knowledge Assistant',
  'Customer Support Agent',
  'Internal Search Assistant',
] as const;

export interface AIInitiativeLookup { listInitiatives(tenantId: string): Promise<Array<{ id: string; name: string }>> }

export async function backfillCanonicalAICapitalAllocations(
  tenantId: string,
  service: AICapitalAllocationAuthorityService,
  initiativeLookup: AIInitiativeLookup,
) {
  const initiatives = await initiativeLookup.listInitiatives(tenantId);
  const canonicalInitiatives = initiatives.filter((i) => (AI_CAPITAL_ALLOCATION_CANONICAL_NAMES as readonly string[]).includes(i.name));
  return Promise.all(canonicalInitiatives.map(async (initiative) => {
    await service.createAllocation({ tenantId, initiativeId: initiative.id });
    return service.evaluateAllocation(tenantId, initiative.id);
  }));
}
