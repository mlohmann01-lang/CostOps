// Program E1 — Capability 8: AI Economics Authority.
//
// Tenant-scoped verdict on whether AI economics are trustworthy enough to
// act on — derived purely from real AIEconomicsMetric coverage and AI3's
// graph dependency health. Zero initiatives is reported honestly as
// NOT_READY, never inferred as readiness.

import { aiValueGraphService } from '../ai-value-graph/ai-value-graph-service';
import { aiEconomicsGraphAuthorityService } from './ai-economics-authority-service';
import type { AIEconomicsAuthorityResult } from './ai-economics-authority-types';

export async function getAIEconomicsAuthority(tenantId: string): Promise<AIEconomicsAuthorityResult> {
  const metrics = await aiEconomicsGraphAuthorityService.getAllInitiativeEconomics(tenantId);
  const graph = await aiValueGraphService.getGraph(tenantId);

  if (metrics.length === 0) {
    return {
      authority: 'AI_ECONOMICS_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      spendCoverage: { total: 0, withSpend: 0, ratio: 0 },
      valueCoverage: { total: 0, withValue: 0, ratio: 0 },
      roiCoverage: { total: 0, withROI: 0, ratio: 0 },
      unitEconomicsCoverage: { total: 0, withCostPerOutcome: 0, ratio: 0 },
      confidenceCoverage: { averageConfidence: 0 },
      unknownEconomicsCount: 0,
      graphDependencyHealth: { graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore },
      reasoning: 'No AI initiatives exist for this tenant; economics cannot be claimed ready without data.',
    };
  }

  const withSpend = metrics.filter((m) => m.spendAmount !== undefined).length;
  const withValue = metrics.filter((m) => m.knownValueAmount !== undefined).length;
  const withROI = metrics.filter((m) => m.roiRatio !== undefined).length;
  const withCostPerOutcome = metrics.filter((m) => m.costPerOutcome !== undefined).length;
  const averageConfidence = metrics.reduce((s, m) => s + m.confidenceScore, 0) / metrics.length;
  const unknownEconomicsCount = metrics.reduce((s, m) => s + m.unknowns.length, 0);

  const spendRatio = withSpend / metrics.length;
  const valueRatio = withValue / metrics.length;
  const roiRatio = withROI / metrics.length;
  const unitEconomicsRatio = withCostPerOutcome / metrics.length;
  const graphReady = graph.readiness === 'READY' ? 1 : graph.readiness === 'PARTIAL' ? 0.5 : 0;

  const score = Math.round(
    (spendRatio * 25) + (valueRatio * 20) + (roiRatio * 15) + (unitEconomicsRatio * 15)
    + ((averageConfidence / 100) * 15) + (graphReady * 10),
  );

  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Spend known for ${withSpend}/${metrics.length} initiatives. `
    + `Value known for ${withValue}/${metrics.length} initiatives. `
    + `ROI calculable for ${withROI}/${metrics.length} initiatives. `
    + `Cost per outcome available for ${withCostPerOutcome}/${metrics.length} initiatives. `
    + `Average economics confidence: ${Math.round(averageConfidence)}. `
    + `Value graph dependency is ${graph.readiness} (${graph.completenessScore}/100). `
    + `${unknownEconomicsCount} unknown economics flag(s) recorded across the portfolio.`;

  return {
    authority: 'AI_ECONOMICS_AUTHORITY',
    tenantId,
    verdict,
    score,
    spendCoverage: { total: metrics.length, withSpend, ratio: spendRatio },
    valueCoverage: { total: metrics.length, withValue, ratio: valueRatio },
    roiCoverage: { total: metrics.length, withROI, ratio: roiRatio },
    unitEconomicsCoverage: { total: metrics.length, withCostPerOutcome, ratio: unitEconomicsRatio },
    confidenceCoverage: { averageConfidence },
    unknownEconomicsCount,
    graphDependencyHealth: { graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore },
    reasoning,
  };
}
