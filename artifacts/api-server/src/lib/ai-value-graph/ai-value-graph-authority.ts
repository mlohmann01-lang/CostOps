// Program AI3 — Capability 7: AI Value Graph Authority.
//
// Tenant-scoped. Measures whether the AI value graph itself is trustworthy
// enough for AI Economics to consume — purely from data already proven by
// the Capability 2 builder. Zero initiatives is reported honestly as
// NOT_READY, never inferred as readiness.

import { aiInitiativePortfolioRepository } from '../ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { aiValueAttributionRepository } from '../ai-value-attribution/ai-value-attribution-repository';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { buildAIValueGraph } from './ai-value-graph-builder';
import type { AIValueGraphAuthorityResult } from './ai-value-graph-types';

export async function getAIValueGraphAuthority(tenantId: string): Promise<AIValueGraphAuthorityResult> {
  const initiatives = await aiInitiativePortfolioRepository.listInitiatives(tenantId);

  if (initiatives.length === 0) {
    return {
      authority: 'AI_VALUE_GRAPH_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      initiatives: { total: 0, withOwners: 0, withObjectives: 0, withAssets: 0, withOutcomes: 0 },
      attributions: { total: 0, withEvidence: 0 },
      objectives: { total: 0, withSupportingInitiatives: 0 },
      gapCount: 0,
      reasoning: 'No AI initiatives exist for this tenant; the value graph cannot be claimed ready without data.',
    };
  }

  const acc = await buildAIValueGraph(tenantId);

  const withOwners = initiatives.filter((i) => i.ownerPrincipalId || i.ownerName).length;
  const withObjectives = initiatives.filter((i) => (i.objectiveIds ?? []).length > 0).length;

  const assetLinks = await aiInitiativePortfolioRepository.listAssetLinks(tenantId);
  const withAssets = new Set(assetLinks.map((l) => l.initiativeId)).size;

  const outcomeLinks = await aiInitiativePortfolioRepository.listOutcomeLinks(tenantId);
  const withOutcomes = new Set(outcomeLinks.map((l) => l.initiativeId)).size;

  const attributionLinks = await aiInitiativePortfolioRepository.listAttributionLinks(tenantId);
  const attributionIds = [...new Set(attributionLinks.map((l) => l.attributionId))];
  const attributions = (await Promise.all(attributionIds.map((id) => aiValueAttributionRepository.getAttribution(tenantId, id)))).filter((a): a is NonNullable<typeof a> => a != null);
  const evidenceCounts = await Promise.all(attributions.map((a) => aiValueAttributionRepository.listEvidence(tenantId, { attributionId: a.id })));
  const attributionsWithEvidence = evidenceCounts.filter((e) => e.length > 0).length;

  const businessObjectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);
  const objectivesWithSupportingInitiatives = businessObjectives.filter((o) => initiatives.some((i) => (i.objectiveIds ?? []).includes(o.id))).length;

  const gapCount = acc.gaps.length;
  const highSeverityGaps = acc.gaps.filter((g) => g.severity === 'HIGH').length;

  const ownershipRatio = withOwners / initiatives.length;
  const objectiveRatio = withObjectives / initiatives.length;
  const assetRatio = withAssets / initiatives.length;
  const outcomeRatio = withOutcomes / initiatives.length;
  const evidenceRatio = attributions.length > 0 ? attributionsWithEvidence / attributions.length : 0;
  const objectiveSupportRatio = businessObjectives.length > 0 ? objectivesWithSupportingInitiatives / businessObjectives.length : 1;
  const gapPenalty = Math.min(1, highSeverityGaps / Math.max(1, initiatives.length));

  const score = Math.round(
    (ownershipRatio * 20) + (objectiveRatio * 15) + (assetRatio * 15) + (outcomeRatio * 15)
    + (evidenceRatio * 15) + (objectiveSupportRatio * 10) + ((1 - gapPenalty) * 10),
  );

  const verdict = score >= 90 ? 'READY' : score >= 60 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Ownership: ${withOwners}/${initiatives.length} initiatives owned. `
    + `Objective linkage: ${withObjectives}/${initiatives.length} initiatives linked to an objective. `
    + `Asset linkage: ${withAssets}/${initiatives.length} initiatives linked to an asset. `
    + `Outcome linkage: ${withOutcomes}/${initiatives.length} initiatives have produced an outcome. `
    + `Evidence: ${attributionsWithEvidence}/${attributions.length} attributions have supporting evidence. `
    + `Objectives supported by an initiative: ${objectivesWithSupportingInitiatives}/${businessObjectives.length}. `
    + `${gapCount} graph gap(s) recorded (${highSeverityGaps} high severity).`;

  return {
    authority: 'AI_VALUE_GRAPH_AUTHORITY',
    tenantId,
    verdict,
    score,
    initiatives: { total: initiatives.length, withOwners, withObjectives, withAssets, withOutcomes },
    attributions: { total: attributions.length, withEvidence: attributionsWithEvidence },
    objectives: { total: businessObjectives.length, withSupportingInitiatives: objectivesWithSupportingInitiatives },
    gapCount,
    reasoning,
  };
}
