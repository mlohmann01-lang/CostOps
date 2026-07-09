// Program E2 — AI Capital Allocation Authority. Capabilities 2-9: allocation
// inputs, scoring, recommendation framework, reasoning, confidence,
// portfolio summary, and executive narratives — all derived from E1's
// economics, AI3's graph, AI2's portfolio, and AI1's attribution confidence.
// No new evidence is created here: this module only joins and scores data
// that already exists.

import { aiInitiativePortfolioRepository } from '../ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { aiValueAttributionRepository } from '../ai-value-attribution/ai-value-attribution-repository';
import { aiValueGraphService } from '../ai-value-graph/ai-value-graph-service';
import { aiEconomicsGraphAuthorityService } from '../ai-economics-authority/ai-economics-authority-service';
import type { AIEconomicsMetric } from '../ai-economics-authority/ai-economics-authority-types';
import type {
  AICapitalAllocationConfidence, AICapitalAllocationDecision, AICapitalAllocationRecommendation,
  AICapitalAllocationSummary,
} from './ai-capital-allocation-authority-types';

function confidenceLevelFromScore(score: number): AICapitalAllocationConfidence {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

interface ScoredInitiative {
  initiativeId: string;
  metric: AIEconomicsMetric;
  ownerPresent: boolean;
  lifecycleValid: boolean;
  graphReadiness: string;
  graphCompletenessScore: number;
  hasHighAttributionConfidence: boolean;
  sharedObjectiveInitiativeIds: string[];
  score: number;
}

/**
 * Capability 3: deterministic allocation score from real economics,
 * attribution, graph, and portfolio evidence — never inferred.
 */
async function scoreInitiative(tenantId: string, initiativeId: string, allInitiatives: Awaited<ReturnType<typeof aiInitiativePortfolioRepository.listInitiatives>>): Promise<ScoredInitiative> {
  const initiative = allInitiatives.find((i) => i.id === initiativeId);
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(tenantId, initiativeId);
  const graph = await aiValueGraphService.getInitiativeGraph(tenantId, initiativeId);

  const ownerPresent = Boolean(initiative?.ownerPrincipalId || initiative?.ownerName);
  const lifecycleValid = Boolean(initiative?.lifecycle) && initiative?.lifecycle !== 'RETIRED';

  const attributionLinks = await aiInitiativePortfolioRepository.listAttributionLinks(tenantId, { initiativeId });
  const attributionIds = [...new Set(attributionLinks.map((l) => l.attributionId))];
  const attributions = (await Promise.all(attributionIds.map((id) => aiValueAttributionRepository.getAttribution(tenantId, id)))).filter((a): a is NonNullable<typeof a> => a != null);
  const hasHighAttributionConfidence = attributions.some((a) => a.confidenceLevel === 'HIGH' || a.confidenceLevel === 'VERIFIED');

  // Capability 4 (CONSOLIDATE indicator): other initiatives sharing an objective — real overlap evidence, never assumed.
  const objectiveIds = initiative?.objectiveIds ?? [];
  const sharedObjectiveInitiativeIds = objectiveIds.length > 0
    ? allInitiatives.filter((other) => other.id !== initiativeId && objectiveIds.some((oid) => (other.objectiveIds ?? []).includes(oid))).map((o) => o.id)
    : [];

  const spendKnown = metric.spendAmount !== undefined ? 1 : 0;
  const valueKnown = metric.knownValueAmount !== undefined ? 1 : 0;
  const roiAvailable = metric.roiRatio !== undefined ? 1 : 0;
  const evidenceCount = metric.evidenceCount;
  const graphReady = graph.readiness === 'READY' ? 1 : graph.readiness === 'PARTIAL' ? 0.5 : 0;

  const score = Math.round(
    (spendKnown * 10) + (valueKnown * 10) + (roiAvailable * 10)
    + ((hasHighAttributionConfidence ? 1 : 0) * 15) + (Math.min(evidenceCount, 5) / 5 * 10)
    + (graphReady * 15) + (graph.completenessScore / 100 * 10)
    + ((ownerPresent ? 1 : 0) * 10) + ((lifecycleValid ? 1 : 0) * 5)
    + (Math.min(metric.outcomeCount, 10) / 10 * 5),
  );

  return {
    initiativeId, metric, ownerPresent, lifecycleValid,
    graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore,
    hasHighAttributionConfidence, sharedObjectiveInitiativeIds, score,
  };
}

/**
 * Capability 4-6: maps a scored initiative onto a decision, with rationale
 * referencing only real, already-computed factors, and a confidence score
 * capped by the weakest major dependency (economics confidence).
 */
function decideAllocation(s: ScoredInitiative): { decision: AICapitalAllocationDecision; rationale: string[]; confidenceScore: number } {
  const rationale: string[] = [];
  const { metric } = s;

  rationale.push(metric.spendAmount !== undefined ? `known spend of ${metric.spendAmount} ${metric.spendCurrency ?? ''}`.trim() : 'spend is unknown');
  rationale.push(`${metric.outcomeCount} attributed outcome(s) and ${metric.valueSignalCount} value signal(s)`);
  rationale.push(`${s.hasHighAttributionConfidence ? 'HIGH' : 'non-HIGH'} attribution confidence`);
  rationale.push(`economics readiness is ${metric.readiness}`);
  rationale.push(`graph completeness ${s.graphCompletenessScore}%`);
  if (!s.ownerPresent) rationale.push('no owner is recorded');
  if (s.sharedObjectiveInitiativeIds.length > 0) rationale.push(`shares an objective with ${s.sharedObjectiveInitiativeIds.length} other initiative(s)`);
  if (metric.unknowns.length > 0) rationale.push(`unknowns: ${metric.unknowns.join(', ')}`);

  // Confidence cannot exceed economics confidence — the weakest major dependency.
  let confidenceScore = metric.confidenceScore;
  if (!s.ownerPresent) confidenceScore = Math.min(confidenceScore, 60);
  if (s.graphReadiness === 'NOT_READY') confidenceScore = Math.min(confidenceScore, 50);

  let decision: AICapitalAllocationDecision;

  if (!s.ownerPresent || metric.spendAmount === undefined) {
    // REVIEW: unknown economics or an ownership gap — never EXPAND/RETIRE on missing data.
    decision = 'REVIEW';
  } else if (metric.outcomeCount === 0 && metric.valueSignalCount === 0 && metric.evidenceCount === 0) {
    // RETIRE: spend is known (we have invested), yet there is no outcome, value signal, or
    // evidence to show for it — persistent underperformance, not a data gap.
    decision = 'RETIRE';
  } else if (metric.evidenceCount === 0) {
    // REVIEW: outcomes or value signals exist but are not yet evidence-backed.
    decision = 'REVIEW';
  } else if (s.sharedObjectiveInitiativeIds.length > 0 && metric.knownValueAmount !== undefined) {
    // CONSOLIDATE: only when real overlap evidence (shared objective) exists alongside known value.
    decision = 'CONSOLIDATE';
  } else if (
    metric.readiness === 'READY' && s.hasHighAttributionConfidence
    && metric.outcomeCount > 0 && metric.knownValueAmount !== undefined
  ) {
    decision = 'EXPAND';
  } else if (metric.costPerOutcome !== undefined && metric.roiRatio !== undefined && metric.roiRatio < 1) {
    // OPTIMISE: high spend relative to known value — weak efficiency despite known economics.
    decision = 'OPTIMISE';
  } else if (metric.readiness === 'PARTIAL' || metric.readiness === 'READY') {
    decision = 'KEEP';
  } else {
    decision = 'REVIEW';
  }

  return { decision, rationale, confidenceScore };
}

export class AICapitalAllocationDecisionService {
  /** Capabilities 2-6: a single initiative's evidence-backed allocation recommendation. */
  async getInitiativeAllocation(tenantId: string, initiativeId: string): Promise<AICapitalAllocationRecommendation> {
    const allInitiatives = await aiInitiativePortfolioRepository.listInitiatives(tenantId);
    const scored = await scoreInitiative(tenantId, initiativeId, allInitiatives);
    const { decision, rationale, confidenceScore } = decideAllocation(scored);
    const confidenceLevel = confidenceLevelFromScore(confidenceScore);

    return {
      id: `alloc:${initiativeId}`,
      tenantId,
      initiativeId,
      decision,
      confidenceScore,
      confidenceLevel,
      rationale,
      evidenceIds: scored.metric.evidenceIds,
      economicsReadiness: scored.metric.readiness,
      generatedAt: new Date().toISOString(),
    };
  }

  async getAllRecommendations(tenantId: string): Promise<AICapitalAllocationRecommendation[]> {
    const initiatives = await aiInitiativePortfolioRepository.listInitiatives(tenantId);
    return Promise.all(initiatives.map((i) => this.getInitiativeAllocation(tenantId, i.id)));
  }

  /** Initiatives flagged REVIEW — the review backlog. */
  async getReviewBacklog(tenantId: string): Promise<AICapitalAllocationRecommendation[]> {
    const recommendations = await this.getAllRecommendations(tenantId);
    return recommendations.filter((r) => r.decision === 'REVIEW');
  }

  /** Capability 7: portfolio-level allocation view. */
  async getSummary(tenantId: string): Promise<AICapitalAllocationSummary> {
    const recommendations = await this.getAllRecommendations(tenantId);
    const count = (d: AICapitalAllocationDecision) => recommendations.filter((r) => r.decision === d).length;
    const expandCount = count('EXPAND');
    const keepCount = count('KEEP');
    const optimiseCount = count('OPTIMISE');
    const consolidateCount = count('CONSOLIDATE');
    const retireCount = count('RETIRE');
    const reviewCount = count('REVIEW');
    const averageConfidence = recommendations.length > 0 ? recommendations.reduce((s, r) => s + r.confidenceScore, 0) / recommendations.length : 0;

    const executiveSummary = recommendations.length === 0
      ? 'No AI initiatives exist for this tenant; no allocation recommendations can be made.'
      : `${expandCount} initiative(s) should be expanded, ${keepCount} should be maintained, ${optimiseCount} should be optimised, `
        + `${consolidateCount} should be consolidated, ${retireCount} should be retired, and ${reviewCount} need review.`;

    return {
      tenantId,
      totalInitiatives: recommendations.length,
      expandCount, keepCount, optimiseCount, consolidateCount, retireCount, reviewCount,
      averageConfidence,
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Capability 9: human-readable, board/CIO/CFO-friendly narrative for one initiative. */
  async getInitiativeNarrative(tenantId: string, initiativeId: string): Promise<{ initiativeId: string; recommendation: AICapitalAllocationRecommendation; narrative: string }> {
    const recommendation = await this.getInitiativeAllocation(tenantId, initiativeId);
    const initiative = await aiInitiativePortfolioRepository.getInitiative(tenantId, initiativeId);
    const name = initiative?.name ?? initiativeId;
    const reasonPart = recommendation.rationale.map((r) => `- ${r}`).join('\n');
    const narrative = `${name}\n\nRecommendation:\n${recommendation.decision}\n\nReasoning:\n${reasonPart}\n\nConfidence:\n${recommendation.confidenceLevel}`;
    return { initiativeId, recommendation, narrative };
  }

  /**
   * Capability 10: dependency-aware scenario factors — not a forecast, only
   * the real upstream dependencies that would change this recommendation if
   * their state changed.
   */
  async getScenarioFactors(tenantId: string, initiativeId: string): Promise<{ initiativeId: string; currentDecision: AICapitalAllocationDecision; dependencies: string[] }> {
    const recommendation = await this.getInitiativeAllocation(tenantId, initiativeId);
    const dependencies: string[] = [];
    if (recommendation.economicsReadiness !== 'READY') dependencies.push('If economics become READY, allocation confidence increases and decision may change.');
    if (recommendation.decision === 'REVIEW') dependencies.push('If unknown economics or evidence gaps are resolved, this initiative may move out of REVIEW.');
    if (recommendation.confidenceLevel === 'LOW' || recommendation.confidenceLevel === 'MODERATE') dependencies.push('If attribution confidence rises to HIGH or VERIFIED, allocation confidence increases.');
    return { initiativeId, currentDecision: recommendation.decision, dependencies };
  }
}

export const aiCapitalAllocationDecisionService = new AICapitalAllocationDecisionService();
