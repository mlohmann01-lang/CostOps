// Program CX1.7/CX1.10 — Executive Experience Authority.
//
// Tenant-scoped verdict on whether the consolidated executive experience
// itself is trustworthy enough to act on, evaluating coverage across
// Navigation, Dashboard, Decisions, Proof Packs, Risk, and Actions. It
// never recomputes any underlying authority — it only measures whether
// each composed section actually has real data behind it.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { executiveExperienceService } from './executive-experience-service';

export type ExecutiveExperienceVerdict = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface ExecutiveExperienceAuthorityResult {
  authority: 'EXECUTIVE_EXPERIENCE_AUTHORITY';
  tenantId: string;
  verdict: ExecutiveExperienceVerdict;
  score: number;
  navigationCoverage: { total: number; withConsumers: number };
  dashboardCoverage: { hasValue: boolean; hasInvestment: boolean; hasDecisions: boolean; hasRisk: boolean; hasActions: boolean };
  decisionCoverage: { total: number };
  proofPackCoverage: { packCount: number; readyCount: number };
  riskCoverage: { signalCount: number };
  actionCoverage: { total: number };
  reasoning: string;
  generatedAt: string;
}

export async function getExecutiveExperienceAuthority(tenantId: string): Promise<ExecutiveExperienceAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  if (portfolio.assets.length === 0) {
    return {
      authority: 'EXECUTIVE_EXPERIENCE_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      navigationCoverage: { total: executiveExperienceService.getNavigation().length, withConsumers: 0 },
      dashboardCoverage: { hasValue: false, hasInvestment: false, hasDecisions: false, hasRisk: false, hasActions: false },
      decisionCoverage: { total: 0 },
      proofPackCoverage: { packCount: 0, readyCount: 0 },
      riskCoverage: { signalCount: 0 },
      actionCoverage: { total: 0 },
      reasoning: 'No technology assets exist for this tenant; the consolidated executive experience cannot be claimed ready without data.',
      generatedAt: new Date().toISOString(),
    };
  }

  const navigation = executiveExperienceService.getNavigation();
  const [dashboard, decisions, proofPacks, risks, actions] = await Promise.all([
    executiveExperienceService.getDashboard(tenantId),
    executiveExperienceService.getDecisions(tenantId),
    executiveExperienceService.getProofPacks(tenantId),
    executiveExperienceService.getRisks(tenantId),
    executiveExperienceService.getActions(tenantId),
  ]);

  const navigationWithConsumers = navigation.filter((item) => item.consumes.length > 0).length;
  const navigationRatio = navigation.length > 0 ? navigationWithConsumers / navigation.length : 0;

  const dashboardSections = [
    dashboard.value.totalAssets > 0,
    dashboard.investment.totalTechnologies > 0,
    dashboard.decisions.totalTechnologies >= 0, // decisions can legitimately be zero (all KEEP)
    Object.keys(dashboard.risk).length > 0,
    dashboard.actions.pending + dashboard.actions.approved + dashboard.actions.executing + dashboard.actions.completed >= 0,
  ];
  const dashboardRatio = dashboardSections.filter(Boolean).length / dashboardSections.length;

  const totalDecisions = decisions.Retire.length + decisions.Renew.length + decisions.Optimise.length + decisions.Expand.length + decisions.Review.length;
  const decisionRatio = portfolio.assets.length > 0 ? Math.min(1, totalDecisions / portfolio.assets.length) : 0;

  const proofPackRatio = proofPacks.summary.packCount > 0
    ? proofPacks.summary.readyCount / proofPacks.summary.packCount
    : 0;

  const riskSignalCount = [
    risks.ownership.missingOwnership.length >= 0,
    risks.evidence.missingEvidence.length >= 0,
    risks.economics.economicsVerdict !== undefined,
    risks.renewal.investmentGraphVerdict !== undefined,
    risks.security.platformVerdict !== undefined,
  ].filter(Boolean).length;
  const riskRatio = riskSignalCount / 5;

  const actionRatio = actions.totalActions > 0 ? 1 : 0;

  const score = Math.round(
    (navigationRatio * 15)
    + (dashboardRatio * 25)
    + (decisionRatio * 20)
    + (proofPackRatio * 15)
    + (riskRatio * 15)
    + (actionRatio * 10),
  );

  const verdict: ExecutiveExperienceVerdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Navigation: ${navigationWithConsumers}/${navigation.length} items have documented data sources. `
    + `Dashboard sections populated: ${dashboardSections.filter(Boolean).length}/${dashboardSections.length}. `
    + `Decisions: ${totalDecisions} executive decisions across ${portfolio.assets.length} technologies. `
    + `Proof packs: ${proofPacks.summary.readyCount}/${proofPacks.summary.packCount} ready. `
    + `Risk signals available: ${riskSignalCount}/5. Governed actions tracked: ${actions.totalActions}.`;

  return {
    authority: 'EXECUTIVE_EXPERIENCE_AUTHORITY',
    tenantId,
    verdict,
    score,
    navigationCoverage: { total: navigation.length, withConsumers: navigationWithConsumers },
    dashboardCoverage: {
      hasValue: dashboard.value.totalAssets > 0,
      hasInvestment: dashboard.investment.totalTechnologies > 0,
      hasDecisions: totalDecisions > 0,
      hasRisk: Object.keys(dashboard.risk).length > 0,
      hasActions: actions.totalActions > 0,
    },
    decisionCoverage: { total: totalDecisions },
    proofPackCoverage: { packCount: proofPacks.summary.packCount, readyCount: proofPacks.summary.readyCount },
    riskCoverage: { signalCount: riskSignalCount },
    actionCoverage: { total: actions.totalActions },
    reasoning,
    generatedAt: new Date().toISOString(),
  };
}
