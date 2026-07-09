// Program X4 — Capabilities 2-8: allocation inputs, scoring, recommendation
// framework, reasoning, portfolio summary, renewal decision support, and
// executive narratives — all derived from X3's technology economics, X1/X2's
// technology investment graph, and the Technology Portfolio Authority's real
// ownership/renewal data. No economics are recomputed here: this module only
// joins and scores data that already exists.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import type { TechnologyEconomicsMetric } from '../technology-economics-authority/technology-economics-types';
import type {
  TechnologyAllocationConfidence, TechnologyAllocationDecision, TechnologyCapitalAllocationRecommendation,
  TechnologyCapitalAllocationSummary, TechnologyRenewalDecision, TechnologyRenewalRecommendation,
} from './technology-capital-allocation-authority-types';

function confidenceLevelFromScore(score: number): TechnologyAllocationConfidence {
  if (score >= 85) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

interface ScoredAsset {
  assetId: string;
  metric: TechnologyEconomicsMetric;
  ownerPresent: boolean;
  hasCapability: boolean;
  renewalRisk: boolean;
  graphReadiness: string;
  graphCompletenessScore: number;
  overlappingAssetIds: string[];
}

/** Capability 2: real allocation inputs — never recomputes economics. */
async function scoreAsset(tenantId: string, assetId: string): Promise<ScoredAsset> {
  const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
  const metric = await technologyEconomicsService.getAssetEconomics(tenantId, assetId);
  const graph = await technologyInvestmentService.getGraph(tenantId);
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  const ownerPresent = Boolean(asset?.ownerUserId);
  const hasCapability = Boolean(asset?.businessCapability && asset.businessCapability.trim().length > 0);
  const renewalRisk = Boolean(asset && asset.contractIds.length > 0 && asset.renewalIds.length === 0);

  // Capability 3 (CONSOLIDATE indicator): other assets sharing this asset's business capability and
  // vendor — real overlap evidence, never assumed.
  const overlappingAssetIds = asset && hasCapability
    ? portfolio.assets.filter((other) => other.id !== asset.id
      && other.businessCapability === asset.businessCapability
      && other.vendorId !== undefined && other.vendorId === asset.vendorId).map((o) => o.id)
    : [];

  return {
    assetId, metric, ownerPresent, hasCapability, renewalRisk,
    graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore,
    overlappingAssetIds,
  };
}

/**
 * Capability 3: maps a scored asset onto a decision, with rationale
 * referencing only real, already-computed factors, and a confidence score
 * capped by the weakest major dependency (economics confidence).
 */
function decideAllocation(s: ScoredAsset): { decision: TechnologyAllocationDecision; rationale: string[]; confidenceScore: number } {
  const rationale: string[] = [];
  const { metric } = s;

  rationale.push(metric.spendAmount !== undefined ? `known spend of ${metric.spendAmount} ${metric.spendCurrency ?? ''}`.trim() : 'spend is unknown');
  rationale.push(metric.knownValueAmount !== undefined ? `known value of ${metric.knownValueAmount} ${metric.knownValueCurrency ?? ''}`.trim() : 'value is unknown');
  rationale.push(`${metric.outcomeCount} attributed outcome(s), ${metric.evidenceCount} evidence record(s)`);
  rationale.push(`economics readiness is ${metric.readiness}`);
  rationale.push(`technology graph completeness ${s.graphCompletenessScore}%`);
  if (!s.ownerPresent) rationale.push('no owner is recorded');
  if (!s.hasCapability) rationale.push('no business capability mapping');
  if (s.renewalRisk) rationale.push('a contract exists with no tracked renewal');
  if (s.overlappingAssetIds.length > 0) rationale.push(`overlaps with ${s.overlappingAssetIds.length} other asset(s) from the same vendor supporting the same capability`);
  if (metric.unknowns.length > 0) rationale.push(`unknowns: ${metric.unknowns.join(', ')}`);

  // Confidence cannot exceed economics confidence — the weakest major dependency.
  let confidenceScore = metric.confidenceScore;
  if (!s.ownerPresent) confidenceScore = Math.min(confidenceScore, 60);
  if (s.graphReadiness === 'NOT_READY') confidenceScore = Math.min(confidenceScore, 50);

  let decision: TechnologyAllocationDecision;

  if (!s.ownerPresent || metric.spendAmount === undefined || !s.hasCapability) {
    // REVIEW: unknown economics, an ownership gap, or no capability mapping — never EXPAND/RETIRE on missing data.
    decision = 'REVIEW';
  } else if (metric.outcomeCount === 0 && metric.evidenceCount === 0) {
    // RETIRE: spend is known (we have invested), yet there is no outcome or evidence to show for it.
    decision = 'RETIRE';
  } else if (metric.evidenceCount === 0) {
    // REVIEW: outcomes exist but are not yet evidence-backed.
    decision = 'REVIEW';
  } else if (s.overlappingAssetIds.length > 0 && metric.knownValueAmount !== undefined) {
    // CONSOLIDATE: only when real overlap evidence (same capability, same vendor) exists alongside known value.
    decision = 'CONSOLIDATE';
  } else if (s.renewalRisk && metric.knownValueAmount !== undefined && metric.readiness !== 'NOT_READY') {
    // RENEW: renewal approaching, strong value, healthy economics — takes priority over EXPAND
    // because the contract requires an imminent decision regardless of growth potential.
    decision = 'RENEW';
  } else if (
    metric.readiness === 'READY' && confidenceScore >= 70
    && metric.outcomeCount > 0 && metric.knownValueAmount !== undefined
    && (metric.roiRatio === undefined || metric.roiRatio >= 1)
  ) {
    decision = 'EXPAND';
  } else if (metric.costPerOutcome !== undefined && metric.roiRatio !== undefined && metric.roiRatio < 1) {
    // OPTIMISE: known value, weak efficiency, high cost per outcome.
    decision = 'OPTIMISE';
  } else if (metric.readiness === 'PARTIAL' || metric.readiness === 'READY') {
    decision = 'KEEP';
  } else {
    decision = 'REVIEW';
  }

  return { decision, rationale, confidenceScore };
}

export class TechnologyCapitalAllocationDecisionService {
  /** Capabilities 2-4: a single technology asset's evidence-backed allocation recommendation. */
  async getAssetAllocation(tenantId: string, assetId: string): Promise<TechnologyCapitalAllocationRecommendation> {
    const scored = await scoreAsset(tenantId, assetId);
    const { decision, rationale, confidenceScore } = decideAllocation(scored);
    const confidenceLevel = confidenceLevelFromScore(confidenceScore);

    return {
      id: `tech-alloc:${assetId}`,
      tenantId,
      assetId,
      decision,
      confidenceScore,
      confidenceLevel,
      rationale,
      evidenceIds: [],
      economicsReadiness: scored.metric.readiness,
      generatedAt: new Date().toISOString(),
    };
  }

  async getAllRecommendations(tenantId: string): Promise<TechnologyCapitalAllocationRecommendation[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    return Promise.all(portfolio.assets.map((a) => this.getAssetAllocation(tenantId, a.id)));
  }

  /** Vendor-level allocation: rolled up from the vendor's own assets — never recomputed. */
  async getVendorAllocations(tenantId: string, vendorId: string): Promise<TechnologyCapitalAllocationRecommendation[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const assets = portfolio.assets.filter((a) => a.vendorId === vendorId);
    return Promise.all(assets.map((a) => this.getAssetAllocation(tenantId, a.id)));
  }

  /** Assets flagged REVIEW — the review backlog. */
  async getReviewBacklog(tenantId: string): Promise<TechnologyCapitalAllocationRecommendation[]> {
    const recommendations = await this.getAllRecommendations(tenantId);
    return recommendations.filter((r) => r.decision === 'REVIEW');
  }

  /** Capability 5: portfolio-level allocation view. */
  async getSummary(tenantId: string): Promise<TechnologyCapitalAllocationSummary> {
    const recommendations = await this.getAllRecommendations(tenantId);
    const count = (d: TechnologyAllocationDecision) => recommendations.filter((r) => r.decision === d).length;
    const expandCount = count('EXPAND');
    const keepCount = count('KEEP');
    const optimiseCount = count('OPTIMISE');
    const consolidateCount = count('CONSOLIDATE');
    const renewCount = count('RENEW');
    const retireCount = count('RETIRE');
    const reviewCount = count('REVIEW');
    const averageConfidence = recommendations.length > 0 ? recommendations.reduce((s, r) => s + r.confidenceScore, 0) / recommendations.length : 0;

    const executiveSummary = recommendations.length === 0
      ? 'No technology assets exist for this tenant; no allocation recommendations can be made.'
      : `${expandCount} technology asset(s) should be expanded, ${keepCount} should be maintained, ${optimiseCount} should be optimised, `
        + `${consolidateCount} should be consolidated, ${renewCount} are due for renewal, ${retireCount} should be retired, and ${reviewCount} need review.`;

    return {
      tenantId,
      totalTechnologies: recommendations.length,
      expandCount, keepCount, optimiseCount, consolidateCount, renewCount, retireCount, reviewCount,
      averageConfidence,
      executiveSummary,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Capability 8: human-readable, board/CIO/CFO-friendly narrative for one technology asset. */
  async getAssetNarrative(tenantId: string, assetId: string): Promise<{ assetId: string; recommendation: TechnologyCapitalAllocationRecommendation; narrative: string }> {
    const recommendation = await this.getAssetAllocation(tenantId, assetId);
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const name = asset?.name ?? assetId;
    const reasonPart = recommendation.rationale.map((r) => `- ${r}`).join('\n');
    const narrative = `${name}\n\nDecision: ${recommendation.decision}\n\nReasoning:\n${reasonPart}\n\nConfidence: ${recommendation.confidenceLevel}`;
    return { assetId, recommendation, narrative };
  }

  /**
   * Capability 7: Renewal Decision Support. Reuses the Technology Portfolio
   * Authority's real contract/renewal tracking — renewal proximity is the
   * presence of a contract with no tracked renewal, never a fabricated date.
   */
  async getRenewalRecommendation(tenantId: string, assetId: string): Promise<TechnologyRenewalRecommendation> {
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const metric = await technologyEconomicsService.getAssetEconomics(tenantId, assetId);
    const rationale: string[] = [];

    const hasContract = Boolean(asset && asset.contractIds.length > 0);
    const renewalTracked = Boolean(asset && asset.renewalIds.length > 0);

    rationale.push(hasContract ? `${asset!.contractIds.length} contract(s) on record` : 'no contract is on record');
    rationale.push(renewalTracked ? `${asset!.renewalIds.length} renewal record(s) tracked` : 'no renewal is tracked');
    rationale.push(metric.knownValueAmount !== undefined ? `known value of ${metric.knownValueAmount} ${metric.knownValueCurrency ?? ''}`.trim() : 'value is unknown');
    rationale.push(`economics readiness is ${metric.readiness}`);
    rationale.push(`${metric.outcomeCount} attributed outcome(s), ${metric.capabilityCount} capability mapping(s), ${metric.evidenceCount} evidence record(s)`);

    let confidenceScore = metric.confidenceScore;
    if (!asset?.ownerUserId) confidenceScore = Math.min(confidenceScore, 60);

    let decision: TechnologyRenewalDecision;
    if (!hasContract) {
      decision = 'REVIEW';
      rationale.push('no contract exists; renewal decision cannot be evidenced');
    } else if (metric.outcomeCount === 0 && metric.evidenceCount === 0) {
      decision = 'RETIRE';
    } else if (metric.evidenceCount === 0 || metric.capabilityCount === 0) {
      decision = 'REVIEW';
    } else if (metric.knownValueAmount !== undefined && metric.readiness !== 'NOT_READY') {
      decision = 'RENEW';
    } else {
      decision = 'REVIEW';
    }

    return {
      id: `tech-renewal:${assetId}`,
      tenantId,
      assetId,
      decision,
      renewalTracked,
      hasContract,
      rationale,
      confidenceScore,
      generatedAt: new Date().toISOString(),
    };
  }

  /** All renewal recommendations for technologies that have at least one contract on record. */
  async getAllRenewalRecommendations(tenantId: string): Promise<TechnologyRenewalRecommendation[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const withContracts = portfolio.assets.filter((a) => a.contractIds.length > 0);
    return Promise.all(withContracts.map((a) => this.getRenewalRecommendation(tenantId, a.id)));
  }
}

export const technologyCapitalAllocationDecisionService = new TechnologyCapitalAllocationDecisionService();
