// Program AI1 — Capability 7: Attribution Readiness Authority.
//
// Tenant-scoped (attribution data is per-tenant; there is no tenant-agnostic
// reading of "is this tenant's AI value attribution trustworthy"). Evaluates
// four dimensions purely from data already persisted by this module —
// Coverage, Confidence, Evidence Quality, Lineage Completeness — and never
// fabricates a verdict when there is no data: zero attributions is reported
// honestly as NOT_READY rather than defaulted to READY/PARTIAL.

import { aiValueAttributionRepository } from './ai-value-attribution-repository';
import { aiValueAttributionService } from './ai-value-attribution-service';

export type OutcomeAttributionReadinessVerdict = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface OutcomeAttributionReadinessResult {
  authority: 'OUTCOME_ATTRIBUTION_READINESS';
  tenantId: string;
  verdict: OutcomeAttributionReadinessVerdict;
  score: number;
  coverage: { attributionCount: number; attributionsWithEvidence: number; ratio: number };
  confidence: { averageScore: number; verifiedOrHighRatio: number };
  evidenceQuality: { totalEvidenceItems: number; verifiedOrObservedRatio: number };
  lineageCompleteness: { completeLineageRatio: number };
  reasoning: string;
}

export async function getOutcomeAttributionReadiness(tenantId: string): Promise<OutcomeAttributionReadinessResult> {
  const attributions = await aiValueAttributionRepository.listAttributions(tenantId);

  if (attributions.length === 0) {
    return {
      authority: 'OUTCOME_ATTRIBUTION_READINESS',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      coverage: { attributionCount: 0, attributionsWithEvidence: 0, ratio: 0 },
      confidence: { averageScore: 0, verifiedOrHighRatio: 0 },
      evidenceQuality: { totalEvidenceItems: 0, verifiedOrObservedRatio: 0 },
      lineageCompleteness: { completeLineageRatio: 0 },
      reasoning: 'No attributions exist for this tenant; readiness cannot be claimed without data.',
    };
  }

  const evidenceByAttribution = await Promise.all(
    attributions.map((a) => aiValueAttributionRepository.listEvidence(tenantId, { attributionId: a.id })),
  );
  const allEvidence = evidenceByAttribution.flat();
  const attributionsWithEvidence = evidenceByAttribution.filter((e) => e.length > 0).length;
  const coverageRatio = attributionsWithEvidence / attributions.length;

  const confidenceScores = attributions.map((a) => a.confidenceScore).filter((s): s is number => s !== undefined);
  const averageConfidenceScore = confidenceScores.length ? confidenceScores.reduce((sum, s) => sum + s, 0) / confidenceScores.length : 0;
  const verifiedOrHighCount = attributions.filter((a) => a.confidenceLevel === 'VERIFIED' || a.confidenceLevel === 'HIGH').length;
  const verifiedOrHighRatio = verifiedOrHighCount / attributions.length;

  const strongEvidenceCount = allEvidence.filter((e) => e.evidenceStrength === 'VERIFIED' || e.evidenceStrength === 'OBSERVED').length;
  const verifiedOrObservedRatio = allEvidence.length ? strongEvidenceCount / allEvidence.length : 0;

  const lineages = await Promise.all(attributions.map((a) => aiValueAttributionService.getAttributionLineage(tenantId, a.id)));
  const completeLineageRatio = lineages.filter((l) => l.complete).length / attributions.length;

  const score = Math.round(
    (coverageRatio * 25) + (Math.min(1, averageConfidenceScore / 100) * 25) + (verifiedOrObservedRatio * 25) + (completeLineageRatio * 25),
  );

  let verdict: OutcomeAttributionReadinessVerdict;
  if (score >= 80) verdict = 'READY';
  else if (score >= 40) verdict = 'PARTIAL';
  else verdict = 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Coverage: ${attributionsWithEvidence}/${attributions.length} attributions have evidence (${Math.round(coverageRatio * 100)}%). `
    + `Confidence: average score ${Math.round(averageConfidenceScore)}, ${verifiedOrHighCount}/${attributions.length} at VERIFIED/HIGH. `
    + `Evidence quality: ${strongEvidenceCount}/${allEvidence.length || 0} items are VERIFIED/OBSERVED strength. `
    + `Lineage: ${Math.round(completeLineageRatio * 100)}% of attributions have a complete lineage chain.`;

  return {
    authority: 'OUTCOME_ATTRIBUTION_READINESS',
    tenantId,
    verdict,
    score,
    coverage: { attributionCount: attributions.length, attributionsWithEvidence, ratio: Math.round(coverageRatio * 1000) / 1000 },
    confidence: { averageScore: Math.round(averageConfidenceScore * 100) / 100, verifiedOrHighRatio: Math.round(verifiedOrHighRatio * 1000) / 1000 },
    evidenceQuality: { totalEvidenceItems: allEvidence.length, verifiedOrObservedRatio: Math.round(verifiedOrObservedRatio * 1000) / 1000 },
    lineageCompleteness: { completeLineageRatio: Math.round(completeLineageRatio * 1000) / 1000 },
    reasoning,
  };
}
