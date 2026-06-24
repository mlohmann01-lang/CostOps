// Program AO2 — Capabilities AO2.9/AO2.10: Closed Loop Optimisation
// Authority verdict. Tenant-scoped verdict on how much of the closed loop
// (approval through learning) is actually evidenced for this tenant's
// technology recommendations — derived only from real coverage already
// computed by the Closed Loop Optimisation Service. Zero technology assets
// is reported honestly as NOT_READY.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { closedLoopOptimisationService } from './closed-loop-optimisation-service';
import type { ClosedLoopOptimisationAuthorityResult } from './closed-loop-optimisation-types';

export async function getClosedLoopOptimisationAuthority(tenantId: string): Promise<ClosedLoopOptimisationAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  if (portfolio.assets.length === 0) {
    return {
      authority: 'CLOSED_LOOP_OPTIMISATION_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      approvalCoverage: { total: 0, covered: 0, ratio: 0 },
      executionCoverage: { total: 0, covered: 0, ratio: 0 },
      verificationCoverage: { total: 0, covered: 0, ratio: 0 },
      protectionCoverage: { total: 0, covered: 0, ratio: 0 },
      valueCoverage: { total: 0, covered: 0, ratio: 0 },
      learningCoverage: { total: 0, covered: 0, ratio: 0 },
      reasoning: 'No technology assets exist for this tenant; the closed loop cannot be claimed ready without data.',
    };
  }

  const optimisations = await closedLoopOptimisationService.getAllOptimisations(tenantId);
  const total = optimisations.length;

  const coverage = (count: number) => ({ total, covered: count, ratio: total > 0 ? count / total : 0 });

  const approvalCoverage = coverage(optimisations.filter((o) => Boolean(o.approvalId)).length);
  const executionCoverage = coverage(optimisations.filter((o) => Boolean(o.executionId)).length);
  const verificationCoverage = coverage(optimisations.filter((o) => Boolean(o.verificationId)).length);
  const protectionCoverage = coverage(optimisations.filter((o) => Boolean(o.protectionId)).length);
  const valueCoverage = coverage(optimisations.filter((o) => o.lifecycleState === 'VALUE_REALISED' || o.lifecycleState === 'LEARNING_COMPLETE').length);
  const learningCoverage = coverage(optimisations.filter((o) => Boolean(o.learningId)).length);

  const score = Math.round(
    (approvalCoverage.ratio * 15) + (executionCoverage.ratio * 20) + (verificationCoverage.ratio * 20)
    + (protectionCoverage.ratio * 15) + (valueCoverage.ratio * 20) + (learningCoverage.ratio * 10),
  );
  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Of ${total} technology recommendation(s) tracked: `
    + `${approvalCoverage.covered} have an approval record, ${executionCoverage.covered} have a governed execution, `
    + `${verificationCoverage.covered} are verified, ${protectionCoverage.covered} are protected, `
    + `${valueCoverage.covered} have realised value, and ${learningCoverage.covered} have learning evidence.`;

  return {
    authority: 'CLOSED_LOOP_OPTIMISATION_AUTHORITY',
    tenantId,
    verdict,
    score,
    approvalCoverage,
    executionCoverage,
    verificationCoverage,
    protectionCoverage,
    valueCoverage,
    learningCoverage,
    reasoning,
  };
}
