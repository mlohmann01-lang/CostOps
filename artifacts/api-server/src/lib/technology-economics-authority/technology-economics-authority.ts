// Program X3 — Capability 7: Technology Economics Authority.
//
// Tenant-scoped verdict on whether technology economics are trustworthy
// enough to act on — derived purely from real TechnologyEconomicsMetric
// coverage and X1/X2's technology graph dependency health. Zero technology
// assets is reported honestly as NOT_READY, never inferred as readiness.

import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from './technology-economics-service';
import type { TechnologyEconomicsAuthorityResult } from './technology-economics-types';

export async function getTechnologyEconomicsAuthority(tenantId: string): Promise<TechnologyEconomicsAuthorityResult> {
  const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
  const graph = await technologyInvestmentService.getGraph(tenantId);

  if (metrics.length === 0) {
    return {
      authority: 'TECHNOLOGY_ECONOMICS_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      spendCoverage: { total: 0, withSpend: 0, ratio: 0 },
      valueCoverage: { total: 0, withValue: 0, ratio: 0 },
      outcomeCoverage: { total: 0, withOutcomes: 0, ratio: 0 },
      economicsCoverage: { total: 0, withCostPerOutcome: 0, ratio: 0 },
      confidenceCoverage: { averageConfidence: 0 },
      unknownEconomicsCount: 0,
      graphDependencyHealth: { graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore },
      reasoning: 'No technology assets exist for this tenant; economics cannot be claimed ready without data.',
    };
  }

  const withSpend = metrics.filter((m) => m.spendAmount !== undefined).length;
  const withValue = metrics.filter((m) => m.knownValueAmount !== undefined).length;
  const withOutcomes = metrics.filter((m) => m.outcomeCount > 0).length;
  const withCostPerOutcome = metrics.filter((m) => m.costPerOutcome !== undefined).length;
  const averageConfidence = metrics.reduce((s, m) => s + m.confidenceScore, 0) / metrics.length;
  const unknownEconomicsCount = metrics.reduce((s, m) => s + m.unknowns.length, 0);

  const spendRatio = withSpend / metrics.length;
  const valueRatio = withValue / metrics.length;
  const outcomeRatio = withOutcomes / metrics.length;
  const economicsRatio = withCostPerOutcome / metrics.length;
  const graphReady = graph.readiness === 'READY' ? 1 : graph.readiness === 'PARTIAL' ? 0.5 : 0;

  const score = Math.round(
    (spendRatio * 25) + (valueRatio * 20) + (outcomeRatio * 15) + (economicsRatio * 15)
    + ((averageConfidence / 100) * 15) + (graphReady * 10),
  );

  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Spend known for ${withSpend}/${metrics.length} technologies. `
    + `Value known for ${withValue}/${metrics.length} technologies. `
    + `Outcomes linked for ${withOutcomes}/${metrics.length} technologies. `
    + `Cost per outcome available for ${withCostPerOutcome}/${metrics.length} technologies. `
    + `Average economics confidence: ${Math.round(averageConfidence)}. `
    + `Technology graph dependency is ${graph.readiness} (${graph.completenessScore}/100). `
    + `${unknownEconomicsCount} unknown economics flag(s) recorded across the portfolio.`;

  return {
    authority: 'TECHNOLOGY_ECONOMICS_AUTHORITY',
    tenantId,
    verdict,
    score,
    spendCoverage: { total: metrics.length, withSpend, ratio: spendRatio },
    valueCoverage: { total: metrics.length, withValue, ratio: valueRatio },
    outcomeCoverage: { total: metrics.length, withOutcomes, ratio: outcomeRatio },
    economicsCoverage: { total: metrics.length, withCostPerOutcome, ratio: economicsRatio },
    confidenceCoverage: { averageConfidence },
    unknownEconomicsCount,
    graphDependencyHealth: { graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore },
    reasoning,
  };
}
