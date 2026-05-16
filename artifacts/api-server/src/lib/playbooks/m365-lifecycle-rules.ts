export type M365LifecycleState =
  | "GENERATED" | "NEEDS_EVIDENCE" | "NEEDS_TRUST_REVIEW" | "GOVERNANCE_REVIEW_REQUIRED"
  | "READY_FOR_REVIEW" | "WORKFLOW_REVIEW" | "ARBITRATED" | "SIMULATED"
  | "OUTCOME_PENDING" | "OUTCOME_RESOLVED" | "SUPPRESSED";

export type M365LifecycleInput = {
  trustBand?: "LOW" | "MEDIUM" | "HIGH" | "QUARANTINED";
  unknownEvidence?: boolean;
  governanceRisk?: boolean;
  privileged?: boolean;
  accountTypeConfidenceLow?: boolean;
  criticalBlockers?: string[];
  legalHoldBlocker?: boolean;
  recommendationType?: string;
};

export function deriveM365LifecycleState(input: M365LifecycleInput): M365LifecycleState {
  if (input.legalHoldBlocker && /STORAGE|DISPOSITION/i.test(input.recommendationType ?? "")) return "SUPPRESSED";
  if ((input.criticalBlockers ?? []).some((b) => /CRITICAL/i.test(b))) return "SUPPRESSED";
  if (input.trustBand === "QUARANTINED") return "SUPPRESSED";
  if (input.unknownEvidence) return "NEEDS_EVIDENCE";
  if (input.accountTypeConfidenceLow || input.trustBand === "LOW") return "NEEDS_TRUST_REVIEW";
  if (input.privileged) return "GOVERNANCE_REVIEW_REQUIRED";
  if (input.trustBand === "MEDIUM") return input.governanceRisk ? "GOVERNANCE_REVIEW_REQUIRED" : "READY_FOR_REVIEW";
  return "READY_FOR_REVIEW";
}
