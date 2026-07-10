// Program EX1 — Capabilities 1-4: executive dashboard aggregation, ranked
// investment view, and risk view. This module never recomputes economics or
// recommendations — it only joins and presents data already produced by
// X1-X4 and the Technology Portfolio Authority.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import type {
  ExecutiveValueSummary, ExecutiveDashboard, ExecutiveInvestmentRow, ExecutiveRiskView,
} from './executive-command-center-types';

// EX1.3: executive priority order, highest priority first. The spec's
// six-decision list (RETIRE, OPTIMISE, RENEW, EXPAND, REVIEW, KEEP) omits
// CONSOLIDATE, which exists in X4's seven-decision TechnologyAllocationDecision
// union. Judgment call: CONSOLIDATE is placed alongside OPTIMISE as a capital
// efficiency action, ahead of RENEW, since both reduce wasted spend.
const INVESTMENT_PRIORITY: Record<string, number> = {
  RETIRE: 0, OPTIMISE: 1, CONSOLIDATE: 1, RENEW: 2, EXPAND: 3, REVIEW: 4, KEEP: 5,
};

export class ExecutiveCommandCenterService {
  /** EX1.1: canonical executive value summary. */
  async getExecutiveValueSummary(tenantId: string): Promise<ExecutiveValueSummary> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
    const graph = await technologyInvestmentService.getGraph(tenantId);
    const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);

    const totalTechnologyAssets = portfolio.assets.length;
    const totalSpendKnown = metrics.reduce((s, m) => s + (m.spendAmount ?? 0), 0);
    const totalValueKnown = metrics.reduce((s, m) => s + (m.knownValueAmount ?? 0), 0);
    const economicsCoverage = totalTechnologyAssets > 0
      ? Math.round((metrics.filter((m) => m.spendAmount !== undefined).length / totalTechnologyAssets) * 100) : 0;
    const recommendationCoverage = totalTechnologyAssets > 0
      ? Math.round((recommendations.length / totalTechnologyAssets) * 100) : 0;
    const ownershipCoverage = totalTechnologyAssets > 0
      ? Math.round((portfolio.assets.filter((a) => Boolean(a.ownerUserId)).length / totalTechnologyAssets) * 100) : 0;
    const graphCoverage = graph.completenessScore;
    const upcomingRenewals = portfolio.assets.filter((a) => a.contractIds.length > 0 && a.renewalIds.length === 0).length;

    return {
      tenantId, totalTechnologyAssets, totalSpendKnown, totalValueKnown,
      economicsCoverage, recommendationCoverage, ownershipCoverage, graphCoverage,
      upcomingRenewals, generatedAt: new Date().toISOString(),
    };
  }

  /** EX1.2: dashboard aggregation grouped into Portfolio / Economics / Recommendations / Risk. */
  async getDashboard(tenantId: string): Promise<ExecutiveDashboard> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
    const summary = await technologyCapitalAllocationDecisionService.getSummary(tenantId);

    const totalContracts = portfolio.assets.reduce((s, a) => s + a.contractIds.length, 0);
    const totalRenewals = portfolio.assets.reduce((s, a) => s + a.renewalIds.length, 0);
    const knownSpend = metrics.reduce((s, m) => s + (m.spendAmount ?? 0), 0);
    const knownValue = metrics.reduce((s, m) => s + (m.knownValueAmount ?? 0), 0);
    const roiCoverage = metrics.length > 0
      ? Math.round((metrics.filter((m) => m.roiRatio !== undefined).length / metrics.length) * 100) : 0;
    const readyCount = metrics.filter((m) => m.readiness === 'READY').length;
    const economicsReadiness: 'READY' | 'PARTIAL' | 'NOT_READY' = metrics.length === 0
      ? 'NOT_READY' : readyCount === metrics.length ? 'READY' : readyCount > 0 ? 'PARTIAL' : 'NOT_READY';

    const unknownOwnershipCount = portfolio.assets.filter((a) => !a.ownerUserId).length;
    const unknownEconomicsCount = metrics.filter((m) => m.spendAmount === undefined).length;
    const unknownRenewalsCount = portfolio.assets.filter((a) => a.contractIds.length > 0 && a.renewalIds.length === 0).length;
    const missingEvidenceCount = portfolio.assets.filter((a) => a.evidenceRefs.length === 0).length;

    return {
      tenantId,
      portfolio: {
        totalAssets: portfolio.assets.length,
        totalVendors: portfolio.vendors.length,
        totalContracts,
        totalRenewals,
      },
      economics: { knownSpend, knownValue, roiCoverage, economicsReadiness },
      recommendations: {
        totalTechnologies: summary.totalTechnologies,
        expandCount: summary.expandCount,
        keepCount: summary.keepCount,
        optimiseCount: summary.optimiseCount,
        consolidateCount: summary.consolidateCount,
        renewCount: summary.renewCount,
        retireCount: summary.retireCount,
        reviewCount: summary.reviewCount,
      },
      risk: { unknownOwnershipCount, unknownEconomicsCount, unknownRenewalsCount, missingEvidenceCount },
      generatedAt: new Date().toISOString(),
    };
  }

  /** EX1.3: ranked executive investment table, highest executive priority first. */
  async getInvestmentView(tenantId: string): Promise<ExecutiveInvestmentRow[]> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);
    const byAsset = new Map(portfolio.assets.map((a) => [a.id, a]));
    const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
    const metricByAsset = new Map(metrics.map((m) => [m.subjectId, m]));

    const rows: ExecutiveInvestmentRow[] = recommendations.map((r) => {
      const asset = byAsset.get(r.assetId);
      const metric = metricByAsset.get(r.assetId);
      return {
        assetId: r.assetId,
        assetName: asset?.name ?? r.assetId,
        recommendation: r.decision,
        confidence: r.confidenceLevel,
        spend: metric?.spendAmount,
        value: metric?.knownValueAmount,
        readiness: r.economicsReadiness,
        rationale: r.rationale,
      };
    });

    return rows.sort((a, b) => (INVESTMENT_PRIORITY[a.recommendation] ?? 99) - (INVESTMENT_PRIORITY[b.recommendation] ?? 99));
  }

  /** EX1.4: executive risk view — reuses existing authority findings, never a new risk model. */
  async getRiskView(tenantId: string): Promise<ExecutiveRiskView> {
    const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
    const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
    const graph = await technologyInvestmentService.getGraph(tenantId);
    const metricByAsset = new Map(metrics.map((m) => [m.subjectId, m]));

    const named = (a: { id: string; name: string }) => ({ assetId: a.id, assetName: a.name });

    return {
      tenantId,
      missingOwnership: portfolio.assets.filter((a) => !a.ownerUserId).map(named),
      missingCapabilityMapping: portfolio.assets.filter((a) => !a.businessCapability || a.businessCapability.trim().length === 0).map(named),
      missingEconomics: portfolio.assets.filter((a) => metricByAsset.get(a.id)?.spendAmount === undefined).map(named),
      missingRenewals: portfolio.assets.filter((a) => a.contractIds.length > 0 && a.renewalIds.length === 0).map(named),
      missingEvidence: portfolio.assets.filter((a) => a.evidenceRefs.length === 0).map(named),
      graphGaps: graph.gaps.map((g) => ({ id: g.id, severity: g.severity, area: g.area, description: g.description })),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const executiveCommandCenterService = new ExecutiveCommandCenterService();
