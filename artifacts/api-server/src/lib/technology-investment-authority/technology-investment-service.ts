// Program X1+X2 — Capabilities 3-9: business capability mapping, technology
// graph completeness, investment recommendations, executive narratives, and
// portfolio summary — all derived from the Capability 2 graph and the
// existing Technology Portfolio Authority / Outcome Attribution data. No new
// economics are computed here; AI Economics / AI Capital Allocation outputs
// are consumed as-is where applicable, never rebuilt.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import type { TechnologyPortfolioAsset } from '../technology-portfolio-authority/technology-portfolio-types';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { buildTechnologyGraph } from './technology-graph-builder';
import type {
  BusinessCapability, TechnologyGraph, TechnologyGraphReadiness, TechnologyInvestmentDecision,
  TechnologyInvestmentRecommendation, TechnologyInvestmentSummary,
} from './technology-investment-types';
import { CAPABILITY_UNKNOWN } from './technology-investment-types';

function readinessFromScore(score: number): TechnologyGraphReadiness {
  if (score >= 90) return 'READY';
  if (score >= 60) return 'PARTIAL';
  return 'NOT_READY';
}

export class TechnologyInvestmentService {
  /** Capability 2: the full per-tenant technology value graph. */
  async getGraph(tenantId: string): Promise<TechnologyGraph> {
    const acc = await buildTechnologyGraph(tenantId);
    const nodes = [...acc.nodes.values()];
    const edges = [...acc.edges.values()];
    const completenessScore = await this.computeCompletenessScore(tenantId, acc.gaps.length);
    return {
      tenantId, nodes, edges, gaps: acc.gaps,
      completenessScore, readiness: readinessFromScore(completenessScore),
    };
  }

  private async computeCompletenessScore(tenantId: string, gapCount: number): Promise<number> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const assets = portfolio.assets;
    if (assets.length === 0) return 0;

    const ownershipRatio = assets.filter((a) => Boolean(a.ownerUserId)).length / assets.length;
    const capabilityRatio = assets.filter((a) => Boolean(a.businessCapability)).length / assets.length;
    const outcomeRatio = assets.filter((a) => a.outcomeIds.length > 0).length / assets.length;
    const evidenceRatio = assets.filter((a) => a.evidenceRefs.length > 0).length / assets.length;
    const renewalRatio = assets.filter((a) => a.contractIds.length === 0 || a.renewalIds.length > 0).length / assets.length;
    const gapPenalty = Math.min(1, gapCount / Math.max(1, assets.length * 3));

    return Math.round(
      (ownershipRatio * 25) + (capabilityRatio * 20) + (outcomeRatio * 20)
      + (evidenceRatio * 15) + (renewalRatio * 10) + ((1 - gapPenalty) * 10),
    );
  }

  /**
   * Capability 3: business capability mapping. Groups assets by their
   * already-recorded businessCapability — never invents a mapping. Assets
   * with no recorded capability fall under CAPABILITY_UNKNOWN.
   */
  async getCapabilities(tenantId: string): Promise<BusinessCapability[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const objectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);
    const byName = new Map<string, TechnologyPortfolioAsset[]>();

    for (const asset of portfolio.assets) {
      const name = asset.businessCapability && asset.businessCapability.trim().length > 0 ? asset.businessCapability : CAPABILITY_UNKNOWN;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push(asset);
    }

    return [...byName.entries()].map(([name, assets]) => {
      const supportingTechnologyIds = assets.map((a) => a.id);
      const outcomeIds = [...new Set(assets.flatMap((a) => a.outcomeIds))];
      const objectiveIds = objectives.filter((o) => (o.linkedAssetIds ?? []).some((assetId) => supportingTechnologyIds.includes(assetId))).map((o) => o.id);
      const owners = new Set(assets.map((a) => a.ownerUserId).filter((o): o is string => Boolean(o)));

      return {
        id: `capability:${name.toLowerCase().replace(/\s+/g, '-')}`,
        tenantId,
        name,
        ownerId: owners.size === 1 ? [...owners][0] : undefined,
        supportingTechnologyIds,
        outcomeIds,
        objectiveIds,
      };
    });
  }

  /** Capability 7: KEEP/OPTIMISE/CONSOLIDATE/RENEW/RETIRE/REVIEW per asset — reusing existing inputs, never recomputing economics. */
  async getRecommendation(tenantId: string, assetId: string): Promise<TechnologyInvestmentRecommendation> {
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const rationale: string[] = [];

    if (!asset) {
      return {
        id: `tech-rec:${assetId}`, tenantId, assetId, decision: 'REVIEW',
        rationale: ['Technology asset was not found in the Technology Portfolio Authority.'],
        confidenceScore: 0, generatedAt: new Date().toISOString(),
      };
    }

    const ownerPresent = Boolean(asset.ownerUserId);
    const hasOutcomes = asset.outcomeIds.length > 0;
    const hasEvidence = asset.evidenceRefs.length > 0;
    const hasCapability = Boolean(asset.businessCapability);
    const renewalRisk = asset.contractIds.length > 0 && asset.renewalIds.length === 0;

    rationale.push(ownerPresent ? `owned by ${asset.ownerUserId}` : 'no owner is recorded');
    rationale.push(hasCapability ? `supports capability "${asset.businessCapability}"` : 'no business capability mapping');
    rationale.push(`${asset.outcomeIds.length} linked outcome(s), ${asset.evidenceRefs.length} evidence record(s)`);
    rationale.push(`lifecycle status is ${asset.lifecycleStatus}`);
    if (renewalRisk) rationale.push('contract exists with no tracked renewal');

    let decision: TechnologyInvestmentDecision;
    let confidenceScore = asset.confidenceScore;
    if (!ownerPresent) confidenceScore = Math.min(confidenceScore, 60);
    if (!hasCapability) confidenceScore = Math.min(confidenceScore, 60);

    if (asset.lifecycleStatus === 'RETIRE_CANDIDATE') {
      decision = 'RETIRE';
    } else if (!ownerPresent || !hasCapability) {
      decision = 'REVIEW';
    } else if (asset.lifecycleStatus === 'DUPLICATE') {
      decision = 'CONSOLIDATE';
    } else if (renewalRisk || asset.lifecycleStatus === 'RENEWAL_RISK') {
      decision = 'RENEW';
    } else if (!hasOutcomes && !hasEvidence) {
      decision = 'REVIEW';
    } else if (asset.lifecycleStatus === 'NON_COMPLIANT') {
      decision = 'OPTIMISE';
    } else if (hasOutcomes && hasEvidence && asset.lifecycleStatus === 'ACTIVE') {
      decision = 'KEEP';
    } else {
      decision = 'REVIEW';
    }

    return { id: `tech-rec:${assetId}`, tenantId, assetId, decision, rationale, confidenceScore, generatedAt: new Date().toISOString() };
  }

  async getAllRecommendations(tenantId: string): Promise<TechnologyInvestmentRecommendation[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    return Promise.all(portfolio.assets.map((a) => this.getRecommendation(tenantId, a.id)));
  }

  /** Capability 8: "Why do we own this?" executive narrative for one technology asset. */
  async getNarrative(tenantId: string, assetId: string): Promise<{ assetId: string; recommendation: TechnologyInvestmentRecommendation; narrative: string }> {
    const asset = await technologyPortfolioAuthorityService.summariseAsset(tenantId, assetId);
    const recommendation = await this.getRecommendation(tenantId, assetId);
    const name = asset?.name ?? assetId;
    const owner = asset?.ownerUserId ?? 'unknown';
    const capability = asset?.businessCapability ?? CAPABILITY_UNKNOWN;
    const outcomeCount = asset?.outcomeIds.length ?? 0;
    const evidenceCount = asset?.evidenceRefs.length ?? 0;

    const narrative = `${name}\n`
      + `Owner: ${owner}\n`
      + `Supports: ${capability}\n`
      + `Outcomes: ${outcomeCount}\n`
      + `Evidence: ${evidenceCount} linked record(s)\n`
      + `Recommendation: ${recommendation.decision}\n`
      + `Reason: ${recommendation.rationale.join('; ')}.`;

    return { assetId, recommendation, narrative };
  }

  /** Capability 9: portfolio-level technology investment summary. */
  async getSummary(tenantId: string): Promise<TechnologyInvestmentSummary> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const capabilities = await this.getCapabilities(tenantId);
    const objectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);
    const recommendations = await this.getAllRecommendations(tenantId);
    const graph = await this.getGraph(tenantId);

    const assets = portfolio.assets;
    const mappedObjectives = objectives.filter((o) => (o.linkedAssetIds ?? []).length > 0).length;
    const mappedOutcomes = assets.filter((a) => a.outcomeIds.length > 0).length;
    const renewalsUpcoming = assets.filter((a) => a.renewalIds.length > 0).length;
    const ownershipCoverage = assets.length > 0 ? assets.filter((a) => Boolean(a.ownerUserId)).length / assets.length : 0;

    const recommendationDistribution: Record<TechnologyInvestmentDecision, number> = {
      KEEP: 0, OPTIMISE: 0, CONSOLIDATE: 0, RENEW: 0, RETIRE: 0, REVIEW: 0,
    };
    for (const r of recommendations) recommendationDistribution[r.decision] += 1;

    return {
      tenantId,
      totalTechnologies: assets.length,
      mappedCapabilities: capabilities.filter((c) => c.name !== CAPABILITY_UNKNOWN).length,
      mappedObjectives,
      mappedOutcomes,
      renewalsUpcoming,
      ownershipCoverage,
      graphCompleteness: graph.completenessScore,
      recommendationDistribution,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const technologyInvestmentService = new TechnologyInvestmentService();
