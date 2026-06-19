import type { AIValueAttributionService } from './ai-value-attribution-service';

/**
 * Workstream 14: canonical AI Activity examples backed by existing AI assets / AI workflows /
 * value signals already present in the tenant. No fabricated telemetry — usage/cost/token
 * fields are left undefined unless real evidence is supplied by the caller.
 */
export const AI_BACKFILL_CANONICAL_PROVIDERS = [
  { provider: 'GitHub', model: 'GitHub Copilot', activityType: 'CODING' as const, activityName: 'GitHub Copilot' },
  { provider: 'Microsoft', model: 'Microsoft Copilot', activityType: 'GENERATION' as const, activityName: 'Microsoft Copilot' },
  { provider: 'OpenAI', model: 'OpenAI', activityType: 'CHAT' as const, activityName: 'OpenAI' },
  { provider: 'Anthropic', model: 'Claude', agent: 'Claude Teams', activityType: 'CHAT' as const, activityName: 'Claude Teams' },
  { provider: 'Certen', agent: 'Internal AI Agent', activityType: 'AUTOMATION' as const, activityName: 'Internal AI Agent' },
] as const;

export interface AIAssetLookup { listAssets(tenantId: string, type?: string): Promise<Array<{ id: string; vendor?: string; name?: string }>> }

export async function backfillCanonicalAIActivities(
  tenantId: string,
  service: AIValueAttributionService,
  sourceSystem = 'CERTEN',
  assetLookup?: AIAssetLookup,
  workflowId?: string,
) {
  const assets = assetLookup ? await assetLookup.listAssets(tenantId) : [];
  return Promise.all(AI_BACKFILL_CANONICAL_PROVIDERS.map(async (canonical) => {
    const matchedAsset = assets.find((a) => (a.vendor ?? '').toLowerCase() === canonical.provider.toLowerCase() || (a.name ?? '').toLowerCase().includes(canonical.activityName.toLowerCase()));
    return service.createAIActivity({
      tenantId,
      workflowId,
      activityType: canonical.activityType,
      activityName: canonical.activityName,
      provider: canonical.provider,
      model: 'model' in canonical ? canonical.model : undefined,
      agent: 'agent' in canonical ? canonical.agent : undefined,
      sourceSystem,
      sourceReference: canonical.activityName.toLowerCase().replace(/\s+/g, '-'),
      metadata: matchedAsset ? { aiAssetId: matchedAsset.id } : {},
    });
  }));
}
