import { getActionRiskProfile } from "../action-risk";

export function evaluateExecutionGate(input: { recommendation: any; mode: "DRY_RUN" | "APPROVAL_EXECUTE"; mvpMode: boolean }) {
  const denialReasons: string[] = [];
  const rec = input.recommendation;

  if (rec.entityTrustScore == null || rec.recommendationTrustScore == null || rec.executionReadinessScore == null) {
    denialReasons.push("MISSING_TRUST_SNAPSHOT");
  }
  if (rec.executionStatus === "BLOCKED") denialReasons.push("TRUST_GATE_BLOCKED");
  if (rec.executionStatus === "INVESTIGATE") denialReasons.push("TRUST_GATE_INVESTIGATE");
  if (Array.isArray(rec.criticalBlockers) && rec.criticalBlockers.length > 0) denialReasons.push("CRITICAL_BLOCKERS_PRESENT");

  const action = "REMOVE_LICENSE";
  const actionRiskProfile = getActionRiskProfile(action);
  if (actionRiskProfile.riskClass === "C") denialReasons.push("ACTION_RISK_CLASS_C_BLOCKED");
  if (actionRiskProfile.riskClass === "B" && input.mode !== "APPROVAL_EXECUTE") denialReasons.push("CLASS_B_REQUIRES_APPROVAL");
  if (input.mvpMode && actionRiskProfile.autoExecuteAllowed) denialReasons.push("MVP_NO_AUTO_EXECUTION");

  return { allowed: denialReasons.length === 0, denialReasons, actionRiskProfile, gate: rec.executionStatus ?? "UNKNOWN" };
}
