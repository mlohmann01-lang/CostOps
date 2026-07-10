// Program EX1 — Capability 1/5: Executive Command Center Authority.
//
// Tenant-scoped verdict on whether the executive view is trustworthy enough
// to act on — derived purely from real coverage already computed by X1-X4.
// Zero technology assets is reported honestly as NOT_READY, never inferred.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { executiveCommandCenterService } from './executive-command-center-service';
import type { ExecutiveCommandCenterAuthorityResult } from './executive-command-center-types';

export async function getExecutiveCommandCenterAuthority(tenantId: string): Promise<ExecutiveCommandCenterAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  if (portfolio.assets.length === 0) {
    return {
      authority: 'EXECUTIVE_COMMAND_CENTER_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      economicsCoverage: { ratio: 0 },
      recommendationCoverage: { ratio: 0 },
      ownershipCoverage: { ratio: 0 },
      graphCoverage: { ratio: 0 },
      reasoning: 'No technology assets exist for this tenant; the executive view cannot be claimed ready without data.',
    };
  }

  const summary = await executiveCommandCenterService.getExecutiveValueSummary(tenantId);
  const economicsCoverage = summary.economicsCoverage / 100;
  const recommendationCoverage = summary.recommendationCoverage / 100;
  const ownershipCoverage = summary.ownershipCoverage / 100;
  const graphCoverage = summary.graphCoverage / 100;

  const score = Math.round((economicsCoverage * 30) + (recommendationCoverage * 25) + (ownershipCoverage * 25) + (graphCoverage * 20));
  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Economics coverage ${summary.economicsCoverage}%. `
    + `Recommendation coverage ${summary.recommendationCoverage}%. Ownership coverage ${summary.ownershipCoverage}%. `
    + `Technology graph completeness ${summary.graphCoverage}%.`;

  return {
    authority: 'EXECUTIVE_COMMAND_CENTER_AUTHORITY',
    tenantId,
    verdict,
    score,
    economicsCoverage: { ratio: economicsCoverage },
    recommendationCoverage: { ratio: recommendationCoverage },
    ownershipCoverage: { ratio: ownershipCoverage },
    graphCoverage: { ratio: graphCoverage },
    reasoning,
  };
}
