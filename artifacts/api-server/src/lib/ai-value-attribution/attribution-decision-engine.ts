// Program AI1 — Capability 6: Attribution Decision Framework.
//
// Extends (does not replace) the existing AIValueAttributionVerdict
// ('ATTRIBUTED' | 'PARTIALLY_ATTRIBUTED' | 'INSUFFICIENT_EVIDENCE' |
// 'UNATTRIBUTED' in ai-value-attribution-types.ts), which evaluates a
// single activity's evidence chain. This module answers a different,
// action-oriented question — "what should we do about this attribution?"
// — by combining confidence, evidence strength, contributor diversity and
// outcome stability into one of the six decision verdicts named in the
// AI1 spec.

import type { AttributionConfidenceLevel, AttributionContributor, AttributionEvidenceRecord, AttributionRecommendation, AttributionRecommendationVerdict } from './ai-value-attribution-types';

export interface AttributionDecisionInputs {
  attributionId: string;
  confidenceLevel: AttributionConfidenceLevel;
  confidenceScore: number;
  evidence: AttributionEvidenceRecord[];
  contributors: AttributionContributor[];
  signalStable?: boolean;
}

export function recommendAttributionAction(inputs: AttributionDecisionInputs): AttributionRecommendation {
  const { attributionId, confidenceLevel, confidenceScore, evidence, contributors, signalStable } = inputs;

  const contributorDiversity = new Set(contributors.map((c) => c.contributorType)).size;
  const hasHumanConfirmation = evidence.some((e) => e.evidenceType === 'HUMAN_CONFIRMATION' || e.evidenceType === 'EXECUTIVE_VALIDATION');

  let verdict: AttributionRecommendationVerdict;
  let reason: string;

  if (evidence.length === 0) {
    verdict = 'INSUFFICIENT_EVIDENCE';
    reason = 'No evidence is attached to this attribution; no decision can be made until evidence is collected.';
  } else if (confidenceLevel === 'LOW' && contributors.length === 0) {
    verdict = 'RETIRE';
    reason = `Confidence is LOW (${confidenceScore}) and no contributors are identified; there is no remaining path to strengthen this attribution.`;
  } else if (confidenceLevel === 'LOW') {
    verdict = 'REVIEW';
    reason = `Confidence is LOW (${confidenceScore}); a human reviewer should validate before any action is taken.`;
  } else if (signalStable === false) {
    verdict = 'REVIEW';
    reason = 'The underlying outcome signal is volatile; a decision now would be premature regardless of confidence.';
  } else if (confidenceLevel === 'VERIFIED' && contributorDiversity >= 2) {
    verdict = 'EXPAND';
    reason = `Confidence is VERIFIED (${confidenceScore}) with ${contributorDiversity} distinct contributor types — this is a strong candidate to scale.`;
  } else if (confidenceLevel === 'HIGH' && contributorDiversity >= 2) {
    verdict = 'OPTIMISE';
    reason = `Confidence is HIGH (${confidenceScore}) across ${contributorDiversity} contributor types — value is real but could be concentrated or improved before expanding.`;
  } else if (confidenceLevel === 'VERIFIED' || confidenceLevel === 'HIGH' || (confidenceLevel === 'MODERATE' && hasHumanConfirmation)) {
    verdict = 'KEEP';
    reason = `Confidence is ${confidenceLevel} (${confidenceScore}); the attribution is defensible as-is, with no immediate need to expand or retire.`;
  } else if (confidenceLevel === 'MODERATE') {
    verdict = 'REVIEW';
    reason = `Confidence is MODERATE (${confidenceScore}) without independent human/executive confirmation — needs review before acting on it.`;
  } else {
    verdict = 'RETIRE';
    reason = `Confidence is ${confidenceLevel} (${confidenceScore}) with no path to improvement visible from current evidence; recommend retiring this attribution rather than acting on it.`;
  }

  return { attributionId, verdict, reasoning: reason };
}
