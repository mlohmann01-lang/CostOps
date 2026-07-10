// Program X1+X2 — Capability 6: Technology Investment Authority.
//
// Tenant-scoped. Measures whether the enterprise technology graph itself is
// trustworthy — purely from data already proven by the Capability 2 builder
// and the Technology Portfolio Authority. Zero technologies is reported
// honestly as NOT_READY, never inferred as readiness.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { buildTechnologyGraph } from './technology-graph-builder';
import type { TechnologyInvestmentAuthorityResult } from './technology-investment-types';

export async function getTechnologyInvestmentAuthority(tenantId: string): Promise<TechnologyInvestmentAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
  const assets = portfolio.assets;

  if (assets.length === 0) {
    return {
      authority: 'TECHNOLOGY_INVESTMENT_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      portfolioCoverage: { total: 0, inGraph: 0 },
      ownership: { total: 0, withOwner: 0 },
      capability: { total: 0, mapped: 0 },
      outcome: { total: 0, withOutcome: 0 },
      objective: { total: 0, withSupportingTechnology: 0 },
      renewal: { total: 0, visible: 0 },
      evidence: { total: 0, withEvidence: 0 },
      gapCount: 0,
      reasoning: 'No technology assets exist for this tenant; the technology investment graph cannot be claimed ready without data.',
    };
  }

  const acc = await buildTechnologyGraph(tenantId);
  const objectives = economicOutcomeAttributionService.listBusinessObjectives(tenantId);

  const withOwner = assets.filter((a) => Boolean(a.ownerUserId)).length;
  const mapped = assets.filter((a) => Boolean(a.businessCapability)).length;
  const withOutcome = assets.filter((a) => a.outcomeIds.length > 0).length;
  const withEvidence = assets.filter((a) => a.evidenceRefs.length > 0).length;
  const assetsWithContracts = assets.filter((a) => a.contractIds.length > 0);
  const renewalVisible = assetsWithContracts.filter((a) => a.renewalIds.length > 0).length;
  const withSupportingTechnology = objectives.filter((o) => (o.linkedAssetIds ?? []).length > 0).length;

  const gapCount = acc.gaps.length;
  const highSeverityGaps = acc.gaps.filter((g) => g.severity === 'HIGH').length;

  const ownershipRatio = withOwner / assets.length;
  const capabilityRatio = mapped / assets.length;
  const outcomeRatio = withOutcome / assets.length;
  const evidenceRatio = withEvidence / assets.length;
  const objectiveRatio = objectives.length > 0 ? withSupportingTechnology / objectives.length : 1;
  const renewalRatio = assetsWithContracts.length > 0 ? renewalVisible / assetsWithContracts.length : 1;
  const gapPenalty = Math.min(1, highSeverityGaps / Math.max(1, assets.length));

  const score = Math.round(
    (ownershipRatio * 20) + (capabilityRatio * 15) + (outcomeRatio * 15)
    + (objectiveRatio * 10) + (renewalRatio * 10) + (evidenceRatio * 15) + ((1 - gapPenalty) * 15),
  );

  const verdict = score >= 90 ? 'READY' : score >= 60 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Ownership: ${withOwner}/${assets.length} technologies owned. `
    + `Capability mapping: ${mapped}/${assets.length} technologies mapped to a business capability. `
    + `Outcome linkage: ${withOutcome}/${assets.length} technologies linked to an outcome. `
    + `Objective coverage: ${withSupportingTechnology}/${objectives.length} objectives supported by technology. `
    + `Renewal visibility: ${renewalVisible}/${assetsWithContracts.length} contracted technologies have a tracked renewal. `
    + `Evidence: ${withEvidence}/${assets.length} technologies have linked evidence. `
    + `${gapCount} graph gap(s) recorded (${highSeverityGaps} high severity).`;

  return {
    authority: 'TECHNOLOGY_INVESTMENT_AUTHORITY',
    tenantId,
    verdict,
    score,
    portfolioCoverage: { total: assets.length, inGraph: assets.length },
    ownership: { total: assets.length, withOwner },
    capability: { total: assets.length, mapped },
    outcome: { total: assets.length, withOutcome },
    objective: { total: objectives.length, withSupportingTechnology },
    renewal: { total: assetsWithContracts.length, visible: renewalVisible },
    evidence: { total: assets.length, withEvidence },
    gapCount,
    reasoning,
  };
}
