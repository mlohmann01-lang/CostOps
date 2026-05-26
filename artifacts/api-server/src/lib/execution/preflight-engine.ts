export type PreflightCheck = { check: string; ok: boolean; message: string };

export function runPreflight(input: {
  executionState: string;
  expiresAt: Date;
  recommendationState: string;
  lifecycleState: string;
  evidencePointers: string[];
  approvalEventIds: string[];
  conflictingEvent?: boolean;
  exclusionBlocked?: boolean;
}) {
  const now = new Date();
  const checks: PreflightCheck[] = [
    { check: "REQUEST_NOT_CANCELLED", ok: input.executionState !== "CANCELLED", message: input.executionState === "CANCELLED" ? "Request is cancelled" : "ok" },
    { check: "REQUEST_NOT_EXPIRED", ok: input.expiresAt.getTime() > now.getTime(), message: input.expiresAt.getTime() > now.getTime() ? "ok" : "Request expired" },
    { check: "RECOMMENDATION_EXECUTION_READY", ok: input.recommendationState === "EXECUTION_READY", message: input.recommendationState === "EXECUTION_READY" ? "ok" : "Recommendation not execution-ready" },
    { check: "LIFECYCLE_TRUSTED", ok: input.lifecycleState === "TRUSTED", message: input.lifecycleState === "TRUSTED" ? "ok" : "Lifecycle not TRUSTED" },
    { check: "EVIDENCE_PRESENT", ok: input.evidencePointers.length > 0, message: input.evidencePointers.length ? "ok" : "Missing evidence" },
    { check: "APPROVAL_EVENT_PRESENT", ok: input.approvalEventIds.length > 0, message: input.approvalEventIds.length ? "ok" : "Missing approval event" },
    { check: "NO_POLICY_EXCLUSION", ok: !input.exclusionBlocked, message: input.exclusionBlocked ? "Policy exclusion triggered" : "ok" },
    { check: "NO_CONFLICTING_GOVERNANCE_EVENT", ok: !input.conflictingEvent, message: input.conflictingEvent ? "Conflicting governance event exists" : "ok" },
  ];
  return checks;
}
