// Program E1 — AI Economics Authority. Capabilities 2-9: spend attribution,
// value attribution, unit economics, confidence, classification, summary,
// and executive narratives — all derived from AI3's graph plus real spend
// (ai-economic-control) and real attributed value (AI1). No new ledgers, no
// new attribution system: this module only joins and computes over data
// that already exists.

import { aiIntelligenceRepository } from '../ai-economic-control/ai-intelligence';
import { aiInitiativePortfolioRepository } from '../ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { aiValueAttributionRepository } from '../ai-value-attribution/ai-value-attribution-repository';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { aiValueGraphService } from '../ai-value-graph/ai-value-graph-service';
import type { AIValueGraphReadiness } from '../ai-value-graph/ai-value-graph-types';
import type {
  AIEconomicsAuthorityResult, AIEconomicsConfidence, AIEconomicsMetric, AIEconomicsReadiness,
  AIEconomicsSubjectType, AIEconomicsGraphSummary,
} from './ai-economics-authority-types';

interface EconomicsInputs {
  assetIds: string[];
  graphReadiness: AIValueGraphReadiness;
  graphCompletenessScore: number;
}

function confidenceLevelFromScore(score: number): AIEconomicsConfidence {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

function readinessFromInputs(spendKnown: boolean, hasOutcomeOrSignal: boolean, evidenceExists: boolean, confidenceScore: number): AIEconomicsReadiness {
  if (spendKnown && hasOutcomeOrSignal && evidenceExists && confidenceScore >= 70) return 'READY';
  if ((spendKnown || hasOutcomeOrSignal || evidenceExists) && confidenceScore >= 40) return 'PARTIAL';
  return 'NOT_READY';
}

/**
 * Capability 2-5: builds one AIEconomicsMetric for a graph subject (an
 * initiative or an asset) by joining real spend records (Capability 2),
 * real attributed value (Capability 3), safe unit economics (Capability 4),
 * and a confidence score (Capability 5). assetIds scopes which AI spend /
 * value-signal records belong to this subject — [subjectId] for an asset,
 * the initiative's linked assets for an initiative.
 */
async function buildMetric(tenantId: string, subjectType: AIEconomicsSubjectType, subjectId: string, inputs: EconomicsInputs): Promise<AIEconomicsMetric> {
  const unknowns: string[] = [];
  const evidenceIds: string[] = [];

  // Capability 2: spend attribution — never invented, summed only from real AISpendRecords.
  const allSpend = aiIntelligenceRepository.listSpend(tenantId);
  const subjectSpend = allSpend.filter((s) => inputs.assetIds.includes(s.assetId));
  const spendAmount = subjectSpend.length > 0 ? subjectSpend.reduce((sum, s) => sum + s.totalSpend, 0) : undefined;
  const spendCurrency = subjectSpend[0]?.currency;
  if (spendAmount === undefined) unknowns.push('SPEND_UNKNOWN');

  // Outcomes and value signals across this subject's known assets.
  const outcomes = inputs.assetIds.flatMap((assetId) => economicOutcomeAttributionService.listEconomicOutcomes(tenantId, { assetId }));
  const valueSignals = inputs.assetIds.flatMap((assetId) => economicOutcomeAttributionService.listValueSignals(tenantId, assetId));
  const outcomeCount = outcomes.length;
  const valueSignalCount = valueSignals.length;

  // Capability 3: value attribution — only AI1 attributions carry a real
  // attributedValueAmount; qualitative value signals never become a dollar figure.
  const attributionLists = await Promise.all(inputs.assetIds.map((assetId) => aiValueAttributionRepository.listAttributions(tenantId, { assetId })));
  const attributions = attributionLists.flat();
  const valuedAttributions = attributions.filter((a) => typeof a.attributedValueAmount === 'number' && a.attributedValueAmount > 0);
  const knownValueAmount = valuedAttributions.length > 0 ? valuedAttributions.reduce((sum, a) => sum + a.attributedValueAmount, 0) : undefined;
  const knownValueCurrency = valuedAttributions[0]?.attributedValueCurrency;
  if (knownValueAmount === undefined) unknowns.push('VALUE_UNKNOWN');

  const evidenceLists = await Promise.all(attributions.map((a) => aiValueAttributionRepository.listEvidence(tenantId, { attributionId: a.id })));
  for (const list of evidenceLists) for (const e of list) evidenceIds.push(e.id);
  const evidenceCount = evidenceIds.length;
  if (evidenceCount === 0) unknowns.push('EVIDENCE_UNKNOWN');

  // Capability 4: unit economics — never divide by zero, never compute ROI without known value.
  const costPerOutcome = spendAmount !== undefined && outcomeCount > 0 ? spendAmount / outcomeCount : undefined;
  const costPerValueSignal = spendAmount !== undefined && valueSignalCount > 0 ? spendAmount / valueSignalCount : undefined;
  const roiRatio = spendAmount !== undefined && spendAmount > 0 && knownValueAmount !== undefined ? knownValueAmount / spendAmount : undefined;
  if (costPerOutcome === undefined && outcomeCount === 0) unknowns.push('OUTCOME_UNKNOWN');

  // Capability 5: confidence — capped where critical data is missing.
  const hasHighAttributionConfidence = attributions.some((a) => a.confidenceLevel === 'HIGH' || a.confidenceLevel === 'VERIFIED');
  const graphReady = inputs.graphReadiness === 'READY' || inputs.graphReadiness === 'PARTIAL';
  let confidenceScore = 0;
  if (spendAmount !== undefined) confidenceScore += 25;
  if (knownValueAmount !== undefined) confidenceScore += 25;
  if (evidenceCount > 0) confidenceScore += 20;
  if (graphReady) confidenceScore += 15;
  if (hasHighAttributionConfidence) confidenceScore += 15;

  if (spendAmount === undefined) confidenceScore = Math.min(confidenceScore, 60);
  if (knownValueAmount === undefined) confidenceScore = Math.min(confidenceScore, 70);
  if (evidenceCount === 0) confidenceScore = Math.min(confidenceScore, 50);

  const confidenceLevel = confidenceLevelFromScore(confidenceScore);
  const readiness = readinessFromInputs(spendAmount !== undefined, outcomeCount > 0 || valueSignalCount > 0, evidenceCount > 0, confidenceScore);

  return {
    id: `econ:${subjectType}:${subjectId}`,
    tenantId,
    subjectType,
    subjectId,
    spendAmount,
    spendCurrency,
    outcomeCount,
    valueSignalCount,
    evidenceCount,
    knownValueAmount,
    knownValueCurrency,
    costPerOutcome,
    costPerValueSignal,
    roiRatio,
    confidenceScore,
    confidenceLevel,
    readiness,
    unknowns,
    evidenceIds,
    generatedAt: new Date().toISOString(),
  };
}

export class AIEconomicsAuthorityServiceV2 {
  /** Capability 3/4: an asset's economics, isolated to that asset's own spend/value/evidence. */
  async getAssetEconomics(tenantId: string, assetId: string): Promise<AIEconomicsMetric> {
    const graph = await aiValueGraphService.getAssetGraph(tenantId, assetId);
    return buildMetric(tenantId, 'AI_ASSET', assetId, { assetIds: [assetId], graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore });
  }

  /** Capability 2-4: an initiative's economics, rolling up spend/value across its linked assets. */
  async getInitiativeEconomics(tenantId: string, initiativeId: string): Promise<AIEconomicsMetric> {
    const assetLinks = await aiInitiativePortfolioRepository.listAssetLinks(tenantId, { initiativeId });
    const assetIds = assetLinks.map((l) => l.assetId);
    const graph = await aiValueGraphService.getInitiativeGraph(tenantId, initiativeId);
    return buildMetric(tenantId, 'INITIATIVE', initiativeId, { assetIds, graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore });
  }

  async getAllInitiativeEconomics(tenantId: string): Promise<AIEconomicsMetric[]> {
    const initiatives = await aiInitiativePortfolioRepository.listInitiatives(tenantId);
    return Promise.all(initiatives.map((i) => this.getInitiativeEconomics(tenantId, i.id)));
  }

  /** Capability 7: portfolio-level economics view. */
  async getSummary(tenantId: string): Promise<AIEconomicsGraphSummary> {
    const metrics = await this.getAllInitiativeEconomics(tenantId);
    const withSpend = metrics.filter((m) => m.spendAmount !== undefined);
    const withValue = metrics.filter((m) => m.knownValueAmount !== undefined);
    const withROI = metrics.filter((m) => m.roiRatio !== undefined);
    const costsPerOutcome = metrics.map((m) => m.costPerOutcome).filter((c): c is number => c !== undefined);

    return {
      tenantId,
      totalInitiatives: metrics.length,
      initiativesWithSpend: withSpend.length,
      initiativesWithValue: withValue.length,
      initiativesWithROI: withROI.length,
      averageCostPerOutcome: costsPerOutcome.length > 0 ? costsPerOutcome.reduce((s, c) => s + c, 0) / costsPerOutcome.length : undefined,
      averageConfidence: metrics.length > 0 ? metrics.reduce((s, m) => s + m.confidenceScore, 0) / metrics.length : 0,
      readyCount: metrics.filter((m) => m.readiness === 'READY').length,
      partialCount: metrics.filter((m) => m.readiness === 'PARTIAL').length,
      notReadyCount: metrics.filter((m) => m.readiness === 'NOT_READY').length,
      unknownSpendCount: metrics.filter((m) => m.unknowns.includes('SPEND_UNKNOWN')).length,
      unknownValueCount: metrics.filter((m) => m.unknowns.includes('VALUE_UNKNOWN')).length,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Capability 9: human-readable narrative for one initiative's economics. */
  async getInitiativeNarrative(tenantId: string, initiativeId: string): Promise<{ initiativeId: string; metric: AIEconomicsMetric; narrative: string }> {
    const metric = await this.getInitiativeEconomics(tenantId, initiativeId);
    const initiative = await aiInitiativePortfolioRepository.getInitiative(tenantId, initiativeId);
    const name = initiative?.name ?? initiativeId;
    const spendPart = metric.spendAmount !== undefined ? `known spend of ${metric.spendAmount} ${metric.spendCurrency ?? ''}`.trim() : 'no known spend';
    const outcomePart = `${metric.outcomeCount} attributed outcome(s) and ${metric.valueSignalCount} value signal(s)`;
    const confidencePart = `${metric.confidenceLevel} attribution confidence`;
    const unitPart = metric.costPerOutcome !== undefined ? `Cost per outcome is ${Math.round(metric.costPerOutcome * 100) / 100}.` : 'Cost per outcome is not available.';
    const roiPart = metric.roiRatio !== undefined
      ? `ROI ratio is ${Math.round(metric.roiRatio * 100) / 100}.`
      : 'ROI is not calculated because monetary value is not yet known.';
    const narrative = `${name} has ${spendPart}, ${outcomePart}, and ${confidencePart}. ${unitPart} ${roiPart}`;
    return { initiativeId, metric, narrative };
  }

  /** Capability 9 (related): unknowns surfaced across the portfolio, never hidden. */
  async getUnknowns(tenantId: string): Promise<{ subjectType: AIEconomicsSubjectType; subjectId: string; unknowns: string[] }[]> {
    const metrics = await this.getAllInitiativeEconomics(tenantId);
    return metrics.filter((m) => m.unknowns.length > 0).map((m) => ({ subjectType: m.subjectType, subjectId: m.subjectId, unknowns: m.unknowns }));
  }
}

export const aiEconomicsGraphAuthorityService = new AIEconomicsAuthorityServiceV2();
