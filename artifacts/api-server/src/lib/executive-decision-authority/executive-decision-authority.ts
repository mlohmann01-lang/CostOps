// Program EX2 — Capability 8: Executive Decision Authority verdict.
//
// Tenant-scoped verdict on whether executive decisions are trustworthy
// enough to act on — derived from real Decision/Evidence/Economics/
// Allocation/Proof Pack coverage already computed upstream. Zero technology
// assets is reported honestly as NOT_READY, never inferred as readiness.
//
// Note: the spec names this same authority ("EXECUTIVE_DECISION_AUTHORITY")
// in both EX2.1 (the decision-conversion service) and EX2.8 (this readiness
// verdict). Mirroring the X1-X4 split of an `xService` class plus a sibling
// `getXAuthority()` verdict function, EX2.1 lives in
// executive-decision-authority-service.ts and this file provides the
// separate verdict function.

import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { technologyEconomicsService } from '../technology-economics-authority/technology-economics-service';
import { technologyCapitalAllocationDecisionService } from '../technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { ExecutiveProofPackService } from '../executive-proof-packs';
import { executiveDecisionAuthorityService } from './executive-decision-authority-service';
import type { ExecutiveDecisionAuthorityResult } from './executive-decision-authority-types';

const executiveProofPackService = new ExecutiveProofPackService();

export async function getExecutiveDecisionAuthority(tenantId: string): Promise<ExecutiveDecisionAuthorityResult> {
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);

  if (portfolio.assets.length === 0) {
    return {
      authority: 'EXECUTIVE_DECISION_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      decisionCoverage: { total: 0, withDecision: 0, ratio: 0 },
      evidenceCoverage: { total: 0, withEvidence: 0, ratio: 0 },
      economicsCoverage: { total: 0, withEconomics: 0, ratio: 0 },
      allocationCoverage: { total: 0, withAllocation: 0, ratio: 0 },
      proofPackCoverage: { available: false, packCount: 0 },
      reasoning: 'No technology assets exist for this tenant; executive decisions cannot be claimed ready without data.',
    };
  }

  const total = portfolio.assets.length;
  const metrics = await technologyEconomicsService.getAllAssetEconomics(tenantId);
  const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);
  const decisions = await executiveDecisionAuthorityService.getAllDecisions(tenantId);
  const proofPacks = await executiveProofPackService.summariseTenantProofPacks(tenantId);

  const withDecision = decisions.length;
  const withEvidence = metrics.filter((m) => m.evidenceCount > 0).length;
  const withEconomics = metrics.filter((m) => m.spendAmount !== undefined).length;
  const withAllocation = recommendations.length;

  const decisionRatio = withDecision / total;
  const evidenceRatio = withEvidence / total;
  const economicsRatio = withEconomics / total;
  const allocationRatio = withAllocation / total;
  const proofPackAvailable = proofPacks.packCount > 0;

  const score = Math.round(
    (decisionRatio * 25) + (evidenceRatio * 20) + (economicsRatio * 20) + (allocationRatio * 20) + (proofPackAvailable ? 15 : 0),
  );
  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Executive decisions exist for ${withDecision}/${total} technologies. `
    + `Evidence present for ${withEvidence}/${total} technologies. Economics known for ${withEconomics}/${total} technologies. `
    + `Allocation recommendations exist for ${withAllocation}/${total} technologies. `
    + `${proofPacks.packCount} executive proof pack(s) on record (${proofPackAvailable ? 'available' : 'none available'}).`;

  return {
    authority: 'EXECUTIVE_DECISION_AUTHORITY',
    tenantId,
    verdict,
    score,
    decisionCoverage: { total, withDecision, ratio: decisionRatio },
    evidenceCoverage: { total, withEvidence, ratio: evidenceRatio },
    economicsCoverage: { total, withEconomics, ratio: economicsRatio },
    allocationCoverage: { total, withAllocation, ratio: allocationRatio },
    proofPackCoverage: { available: proofPackAvailable, packCount: proofPacks.packCount },
    reasoning,
  };
}
