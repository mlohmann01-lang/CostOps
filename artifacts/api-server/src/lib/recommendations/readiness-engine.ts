import { isHighRisk } from "./risk-classifier";
import type { DiscoveryLifecycleState } from "../discovery-intelligence/types";
import type { ExecutionReadiness, RecommendationState } from "./types";

export type ReadinessEvaluationInput = {
  lifecycleState: DiscoveryLifecycleState;
  confidenceScore: number;
  actionRiskClass: "A" | "B" | "C" | "D";
  evidencePointers: string[];
  hasApproval: boolean;
  manualOnly?: boolean;
  neverEligible?: boolean;
};

export function evaluateReadiness(input: ReadinessEvaluationInput): {
  executionReadiness: ExecutionReadiness;
  recommendationState: RecommendationState;
  readinessReasons: string[];
  blockedReasons: string[];
  requiredApprovals: string[];
} {
  const readinessReasons: string[] = [];
  const blockedReasons: string[] = [];
  const requiredApprovals: string[] = [];

  if (input.neverEligible) {
    readinessReasons.push("ACTION_POLICY_NEVER_AUTOMATE");
    return { executionReadiness: "NEVER_ELIGIBLE", recommendationState: "BLOCKED", readinessReasons, blockedReasons: [...blockedReasons, "NEVER_ELIGIBLE_POLICY"], requiredApprovals };
  }

  if (input.evidencePointers.length === 0) blockedReasons.push("MISSING_EVIDENCE_POINTERS");
  if (input.lifecycleState !== "TRUSTED") blockedReasons.push("DISCOVERY_NOT_TRUSTED");
  if (input.manualOnly) readinessReasons.push("MANUAL_ONLY_ACTION_POLICY");

  const highRisk = isHighRisk(input.actionRiskClass);
  if (highRisk) requiredApprovals.push("RISK_CLASS_C_OR_HIGHER");

  if (blockedReasons.length > 0) {
    return { executionReadiness: "BLOCKED", recommendationState: "BLOCKED", readinessReasons, blockedReasons, requiredApprovals };
  }

  if (input.manualOnly) {
    return { executionReadiness: "MANUAL_ONLY", recommendationState: "EVIDENCE_READY", readinessReasons, blockedReasons, requiredApprovals };
  }

  if ((highRisk || input.actionRiskClass === "B") && !input.hasApproval) {
    readinessReasons.push(highRisk ? "HIGH_RISK_APPROVAL_REQUIRED" : "RISK_CLASS_B_APPROVAL_REQUIRED");
    return { executionReadiness: "APPROVAL_REQUIRED", recommendationState: "APPROVAL_REQUIRED", readinessReasons, blockedReasons, requiredApprovals };
  }

  if (input.confidenceScore < 0.9) {
    readinessReasons.push("CONFIDENCE_BELOW_AUTO_EXECUTION_THRESHOLD");
    return { executionReadiness: "APPROVAL_REQUIRED", recommendationState: "APPROVAL_REQUIRED", readinessReasons, blockedReasons, requiredApprovals };
  }

  readinessReasons.push("TRUSTED_EVIDENCE_READY_AND_CONFIDENT");
  return { executionReadiness: "AUTO_EXECUTE_ELIGIBLE", recommendationState: "EXECUTION_READY", readinessReasons, blockedReasons, requiredApprovals };
}
