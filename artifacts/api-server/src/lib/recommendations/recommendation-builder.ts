import { evaluateReadiness } from "./readiness-engine";
import type { GovernedRecommendationInput, GovernedRecommendationObject } from "./types";

export function buildGovernedRecommendation(input: GovernedRecommendationInput): GovernedRecommendationObject {
  const now = new Date().toISOString();
  const readiness = evaluateReadiness({
    lifecycleState: input.discoveryLifecycleState,
    confidenceScore: input.confidenceScore,
    actionRiskClass: input.actionRiskClass,
    evidencePointers: input.evidencePointers,
    hasApproval: Boolean(input.hasApproval),
    manualOnly: Boolean(input.manualOnly),
    neverEligible: Boolean(input.neverEligible),
  });

  return {
    ...input,
    executionReadiness: readiness.executionReadiness,
    readinessReasons: readiness.readinessReasons,
    blockedReasons: readiness.blockedReasons,
    requiredApprovals: readiness.requiredApprovals,
    recommendationState: readiness.recommendationState,
    createdAt: now,
    updatedAt: now,
  };
}
