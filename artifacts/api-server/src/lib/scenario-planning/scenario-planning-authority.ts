// Program EX3 — Capability 6: Scenario Planning Authority verdict.
//
// Tenant-scoped verdict on whether scenario impacts can be trusted —
// derived from real Graph/Economics/Decision/Scenario coverage already
// computed upstream. Zero technology assets is reported honestly as
// NOT_READY, never inferred as readiness.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyInvestmentService } from '../technology-investment-authority/technology-investment-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { scenarioPlanningService } from './scenario-planning-service';
import type { ScenarioPlanningAuthorityResult } from './scenario-planning-types';

export async function getScenarioPlanningAuthority(tenantId: string): Promise<ScenarioPlanningAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  if (portfolio.assets.length === 0) {
    return {
      authority: 'SCENARIO_PLANNING_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      graphCoverage: { graphReadiness: 'NOT_READY', graphCompletenessScore: 0 },
      economicsCoverage: { total: 0, withEconomics: 0, ratio: 0 },
      decisionCoverage: { total: 0, withDecision: 0, ratio: 0 },
      scenarioCoverage: { total: 0, withScenario: 0, ratio: 0 },
      reasoning: 'No technology assets exist for this tenant; scenario impacts cannot be claimed ready without data.',
    };
  }

  const total = portfolio.assets.length;
  const graph = await technologyInvestmentService.getGraph(tenantId);
  const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
  const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);
  const scenarios = await Promise.all(portfolio.assets.map((a) => scenarioPlanningService.analyzeScenario(tenantId, 'RETIRE', 'TECHNOLOGY', a.id)));

  const withEconomics = metrics.filter((m) => m.spendAmount !== undefined).length;
  const withDecision = recommendations.length;
  const withScenario = scenarios.filter((s) => s.impactedAssets > 0).length;

  const economicsRatio = withEconomics / total;
  const decisionRatio = withDecision / total;
  const scenarioRatio = withScenario / total;

  const score = Math.round(
    (graph.completenessScore * 0.4) + (economicsRatio * 100 * 0.2) + (decisionRatio * 100 * 0.2) + (scenarioRatio * 100 * 0.2),
  );
  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Technology graph completeness is ${graph.completenessScore}% (${graph.readiness}). `
    + `Economics known for ${withEconomics}/${total} technologies. Allocation decisions exist for ${withDecision}/${total} technologies. `
    + `Scenario impact is graph-derivable for ${withScenario}/${total} technologies.`;

  return {
    authority: 'SCENARIO_PLANNING_AUTHORITY',
    tenantId,
    verdict,
    score,
    graphCoverage: { graphReadiness: graph.readiness, graphCompletenessScore: graph.completenessScore },
    economicsCoverage: { total, withEconomics, ratio: economicsRatio },
    decisionCoverage: { total, withDecision, ratio: decisionRatio },
    scenarioCoverage: { total, withScenario, ratio: scenarioRatio },
    reasoning,
  };
}
