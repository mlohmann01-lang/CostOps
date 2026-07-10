// Program AI1 — Attribution Confidence Engine.
//
// Deterministic, explainable, no-LLM scoring. Every input is grounded in
// real evidence/contributor data already attached to an attribution by the
// time this runs — this function never infers facts that were not
// supplied to it. Correlation (time proximity, multiple aligned signals)
// is never treated as proof of causation: it raises confidence, it never
// produces a VERIFIED level on its own (see scoreFrom below).

import type { AttributionConfidenceInputs, AttributionConfidenceLevel, AttributionConfidenceResult, AttributionEvidenceStrength } from './ai-value-attribution-types';

const EVIDENCE_STRENGTH_POINTS: Record<AttributionEvidenceStrength, number> = {
  ESTIMATED: 10,
  INFERRED: 18,
  OBSERVED: 25,
  VERIFIED: 30,
};

export function confidenceLevelFromScore(score: number): AttributionConfidenceLevel {
  if (score >= 90) return 'VERIFIED';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MODERATE';
  return 'LOW';
}

/**
 * Score components (each capped, summed, then clamped to [0, 100]):
 *  - Evidence strength: average per-item points (ESTIMATED..VERIFIED), up to 30.
 *  - Source diversity: +6 per distinct source beyond the first, capped at 24
 *    (rewards independent corroboration; a single source can never alone
 *    reach VERIFIED).
 *  - Attribution stability: +20 when the outcome signal has been observed
 *    as consistent, -10 when known volatile, 0 when unknown.
 *  - Time correlation: up to +20, decaying linearly to 0 as the gap between
 *    evidence and the outcome grows past 30 days; 0 when unknown.
 * VERIFIED additionally requires at least 2 distinct sources and no
 * VERIFIED-strength evidence item missing — i.e. correlation alone cannot
 * reach VERIFIED, only strong, corroborated, directly observed evidence can.
 */
export function computeAttributionConfidence(inputs: AttributionConfidenceInputs): AttributionConfidenceResult {
  const { evidenceStrengths, distinctSourceCount, signalStable, timeCorrelationHours } = inputs;

  const evidenceComponent = evidenceStrengths.length
    ? Math.round(evidenceStrengths.reduce((sum, s) => sum + EVIDENCE_STRENGTH_POINTS[s], 0) / evidenceStrengths.length)
    : 0;

  const diversityComponent = Math.min(24, Math.max(0, distinctSourceCount - 1) * 6);

  const stabilityComponent = signalStable === true ? 20 : signalStable === false ? -10 : 0;

  const timeComponent = timeCorrelationHours === undefined
    ? 0
    : Math.max(0, Math.round(20 * (1 - Math.min(1, timeCorrelationHours / (30 * 24)))));

  let score = Math.max(0, Math.min(100, evidenceComponent + diversityComponent + stabilityComponent + timeComponent));

  const hasVerifiedEvidence = evidenceStrengths.includes('VERIFIED');
  if (score >= 90 && !(distinctSourceCount >= 2 && hasVerifiedEvidence)) {
    score = 89; // cap: correlation/strength alone cannot claim VERIFIED without corroboration + at least one truly verified item.
  }

  const level = confidenceLevelFromScore(score);

  const reasonParts: string[] = [];
  reasonParts.push(evidenceStrengths.length
    ? `${evidenceStrengths.length} evidence item(s) averaging ${evidenceComponent}/30 strength points`
    : 'no evidence items attached');
  reasonParts.push(`${distinctSourceCount} distinct source(s) (+${diversityComponent} for diversity)`);
  reasonParts.push(signalStable === true ? 'outcome signal observed as stable (+20)' : signalStable === false ? 'outcome signal observed as volatile (-10)' : 'outcome signal stability unknown (+0)');
  reasonParts.push(timeCorrelationHours === undefined ? 'time correlation unknown (+0)' : `evidence-to-outcome gap of ${timeCorrelationHours}h (+${timeComponent})`);

  const reasoning = `${level} (${score}). ${reasonParts.join('; ')}. Correlation and source count raise confidence but never substitute for verified evidence.`;

  return { score, level, reasoning };
}
