import type { TrustSnapshot } from './decision-authority-types';

export interface ReasoningInputs {
  utilisationBelowThresholdDays?: number;
  ownershipReviewCompleted?: boolean;
  trustSnapshot?: TrustSnapshot;
  trustThreshold?: number;
  projectedSavings?: number;
  policyMinimumSavings?: number;
  evidenceCount?: number;
  approverPrincipalId?: string;
}

/** Pure, deterministic rationale builder. No LLM dependency. */
export function buildDecisionRationale(inputs: ReasoningInputs): string[] {
  const rationale: string[] = [];

  if (inputs.utilisationBelowThresholdDays !== undefined) {
    rationale.push(`utilisation remained below threshold for ${inputs.utilisationBelowThresholdDays} days`);
  }
  if (inputs.ownershipReviewCompleted) {
    rationale.push('ownership review completed');
  }
  if (inputs.trustSnapshot && inputs.trustThreshold !== undefined && inputs.trustSnapshot.trustScore >= inputs.trustThreshold) {
    rationale.push('trust score exceeded threshold');
  }
  if (inputs.projectedSavings !== undefined && inputs.policyMinimumSavings !== undefined && inputs.projectedSavings >= inputs.policyMinimumSavings) {
    rationale.push('projected savings exceeded policy minimum');
  }
  if (inputs.evidenceCount !== undefined && inputs.evidenceCount > 0) {
    rationale.push(`supported by ${inputs.evidenceCount} evidence item${inputs.evidenceCount === 1 ? '' : 's'}`);
  }
  if (inputs.approverPrincipalId) {
    rationale.push('approval recorded by accountable principal');
  }

  return rationale;
}
