import type { BuildExecutionRequestInput } from "./types";

export function validateExecutionRequestPreconditions(input: BuildExecutionRequestInput): string[] {
  const reasons: string[] = [];
  if (input.recommendation.executionReadiness !== "AUTO_EXECUTE_ELIGIBLE") reasons.push("RECOMMENDATION_NOT_EXECUTION_READY");
  if (input.recommendation.recommendationState === "BLOCKED") reasons.push("RECOMMENDATION_BLOCKED");
  if (input.recommendation.executionReadiness === "NEVER_ELIGIBLE") reasons.push("RECOMMENDATION_NEVER_ELIGIBLE");
  if (!input.recommendation.evidencePointers?.length) reasons.push("MISSING_EVIDENCE_POINTERS");
  if (!input.approvalEventIds.length) reasons.push("MISSING_APPROVAL_EVENT");
  return reasons;
}
