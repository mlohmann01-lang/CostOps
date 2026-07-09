// Program AO1 — Capability AO1.8: Recommendation Orchestration Authority
// verdict. Tenant-scoped verdict on whether recommendations are trustworthy
// enough to orchestrate into execution — derived from real Execution
// Readiness/Approval/Evidence/Orchestration coverage already computed
// upstream. Zero technology assets is reported honestly as NOT_READY.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { recommendationOrchestrationService } from './recommendation-orchestration-service';
import type { RecommendationOrchestrationAuthorityResult } from './recommendation-orchestration-types';

export async function getRecommendationOrchestrationAuthority(tenantId: string): Promise<RecommendationOrchestrationAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  if (portfolio.assets.length === 0) {
    return {
      authority: 'RECOMMENDATION_ORCHESTRATION_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      executionReadinessCoverage: { total: 0, ready: 0, ratio: 0 },
      approvalCoverage: { total: 0, withApprovals: 0, ratio: 0 },
      evidenceCoverage: { total: 0, withEvidence: 0, ratio: 0 },
      orchestrationCoverage: { total: 0, withPlan: 0, ratio: 0 },
      reasoning: 'No technology assets exist for this tenant; recommendation orchestration cannot be claimed ready without data.',
    };
  }

  const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);
  const total = recommendations.length;
  const plans = await recommendationOrchestrationService.getAllExecutionPlans(tenantId);

  const withPlan = plans.length;
  const ready = plans.filter((p) => p.readiness === 'READY').length;
  const withApprovals = plans.filter((p) => p.requiredApprovals.length > 0).length;
  const withEvidence = plans.filter((p) => p.requiredEvidence.length > 0).length;

  const planRatio = total > 0 ? withPlan / total : 0;
  const readinessRatio = withPlan > 0 ? ready / withPlan : 0;
  const approvalRatio = withPlan > 0 ? withApprovals / withPlan : 0;
  const evidenceRatio = withPlan > 0 ? withEvidence / withPlan : 0;

  const score = Math.round((readinessRatio * 40) + (approvalRatio * 20) + (evidenceRatio * 20) + (planRatio * 20));
  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Execution plans exist for ${withPlan}/${total} allocation recommendations, `
    + `${ready}/${withPlan || 0} are execution-ready. Approvals identified for ${withApprovals}/${withPlan || 0} plans. `
    + `Evidence is recorded for ${withEvidence}/${withPlan || 0} plans.`;

  return {
    authority: 'RECOMMENDATION_ORCHESTRATION_AUTHORITY',
    tenantId,
    verdict,
    score,
    executionReadinessCoverage: { total: withPlan, ready, ratio: readinessRatio },
    approvalCoverage: { total: withPlan, withApprovals, ratio: approvalRatio },
    evidenceCoverage: { total: withPlan, withEvidence, ratio: evidenceRatio },
    orchestrationCoverage: { total, withPlan, ratio: planRatio },
    reasoning,
  };
}
