// Program X4 — Capability 6: Technology Capital Allocation Authority.
//
// Tenant-scoped verdict on whether allocation recommendations are
// trustworthy enough to act on — derived purely from real recommendation
// coverage, confidence, evidence, and economics readiness. Zero technology
// assets is reported honestly as NOT_READY, never inferred as readiness.

import { technologyCapitalAllocationDecisionService } from './technology-capital-allocation-authority-service';
import type { TechnologyCapitalAllocationAuthorityResult } from './technology-capital-allocation-authority-types';

export async function getTechnologyCapitalAllocationAuthority(tenantId: string): Promise<TechnologyCapitalAllocationAuthorityResult> {
  const recommendations = await technologyCapitalAllocationDecisionService.getAllRecommendations(tenantId);

  if (recommendations.length === 0) {
    return {
      authority: 'TECHNOLOGY_CAPITAL_ALLOCATION_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      allocationCoverage: { total: 0, withDecision: 0, ratio: 0 },
      decisionConfidenceCoverage: { averageConfidence: 0 },
      evidenceCoverage: { total: 0, withEvidence: 0, ratio: 0 },
      economicsReadinessCoverage: { total: 0, ready: 0, ratio: 0 },
      reviewBacklog: { total: 0, reviewCount: 0, ratio: 0 },
      reasoning: 'No technology assets exist for this tenant; allocation cannot be claimed ready without data.',
    };
  }

  const withDecision = recommendations.filter((r) => r.decision !== 'REVIEW').length;
  const withEvidence = recommendations.filter((r) => r.evidenceIds.length > 0).length;
  const ready = recommendations.filter((r) => r.economicsReadiness === 'READY').length;
  const reviewCount = recommendations.filter((r) => r.decision === 'REVIEW').length;
  const averageConfidence = recommendations.reduce((s, r) => s + r.confidenceScore, 0) / recommendations.length;

  const allocationRatio = withDecision / recommendations.length;
  const evidenceRatio = withEvidence / recommendations.length;
  const readyRatio = ready / recommendations.length;
  const reviewRatio = reviewCount / recommendations.length;

  const score = Math.round(
    (allocationRatio * 30) + (evidenceRatio * 20) + (readyRatio * 20)
    + ((averageConfidence / 100) * 20) + ((1 - reviewRatio) * 10),
  );

  const verdict = score >= 80 ? 'READY' : score >= 50 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). ${withDecision}/${recommendations.length} technology assets have a real (non-REVIEW) decision. `
    + `${withEvidence}/${recommendations.length} recommendations are evidence-backed. `
    + `${ready}/${recommendations.length} technology assets have READY economics. `
    + `Average allocation confidence: ${Math.round(averageConfidence)}. `
    + `${reviewCount} technology asset(s) are in the review backlog.`;

  return {
    authority: 'TECHNOLOGY_CAPITAL_ALLOCATION_AUTHORITY',
    tenantId,
    verdict,
    score,
    allocationCoverage: { total: recommendations.length, withDecision, ratio: allocationRatio },
    decisionConfidenceCoverage: { averageConfidence },
    evidenceCoverage: { total: recommendations.length, withEvidence, ratio: evidenceRatio },
    economicsReadinessCoverage: { total: recommendations.length, ready, ratio: readyRatio },
    reviewBacklog: { total: recommendations.length, reviewCount, ratio: reviewRatio },
    reasoning,
  };
}
