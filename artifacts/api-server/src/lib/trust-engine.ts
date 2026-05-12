export type ReconciliationTrustSignals = {
  identitySignals?: unknown[];
  entitlementSignals?: unknown[];
  ownershipSignals?: unknown[];
  conflictSignals?: unknown[];
  recommendedTrustImpact?: "NONE" | "WARNING" | "DOWNGRADE" | "BLOCK";
};

export type TrustAssessmentResult = {
  entity_trust_score: number;
  recommendation_trust_score: number;
  execution_readiness_score: number;
  execution_gate: "BLOCKED" | "AUTO_EXECUTE_ELIGIBLE" | "APPROVAL_REQUIRED" | "INVESTIGATE";
  critical_blockers: string[];
  warnings: string[];
  score_breakdown: Record<string, number>;
};

const assignGate = (score: number, hasBlockers: boolean, mvpMode: boolean): TrustAssessmentResult["execution_gate"] => {
  if (hasBlockers) return "BLOCKED";
  if (score >= 0.9) return mvpMode ? "APPROVAL_REQUIRED" : "AUTO_EXECUTE_ELIGIBLE";
  if (score >= 0.75) return "APPROVAL_REQUIRED";
  if (score >= 0.5) return "INVESTIGATE";
  return "BLOCKED";
};

const b = (n: number) => Math.max(0, Math.min(1, n));

export function assessTrust(context: any): TrustAssessmentResult {
  const e = context.entity_input;
  const r = context.recommendation_input;
  const x = context.execution_input;

  const entity = b(e.identity_confidence * 0.3 + e.source_consistency * 0.25 + e.data_freshness * 0.2 + e.ownership_confidence * 0.15 + e.source_reliability * 0.1);
  const recommendation = b(entity * 0.35 + r.usage_signal_quality * 0.25 + r.entitlement_confidence * 0.2 + r.policy_fit * 0.1 + r.savings_confidence * 0.1);
  const baseRecommendation = recommendation;

  const reconciliationSignals: ReconciliationTrustSignals | undefined = context.reconciliationTrustSignals;
  const impact = reconciliationSignals?.recommendedTrustImpact ?? "NONE";
  const downgradeFactor = context.reconciliationDowngradeFactor ?? 0.15;

  const downgradedRecommendation = impact === "DOWNGRADE" ? b(baseRecommendation * (1 - downgradeFactor)) : baseRecommendation;
  const execution = b(downgradedRecommendation * 0.35 + x.action_reversibility * 0.2 + x.approval_state * 0.2 + x.blast_radius_score * 0.15 + x.rollback_confidence * 0.1);

  const blockers: string[] = [];
  const c = context.blocker_context ?? {};
  if (c.identity_conflict) blockers.push("IDENTITY_CONFLICT");
  if (c.entitlement_conflict) blockers.push("ENTITLEMENT_CONFLICT");
  if (c.source_stale_beyond_sla) blockers.push("SOURCE_STALE_BEYOND_SLA");
  if (c.connector_health_failed) blockers.push("CONNECTOR_HEALTH_FAILED");
  if (c.owner_unknown_for_chargeable_action) blockers.push("OWNER_UNKNOWN_FOR_CHARGEABLE_ACTION");
  if (c.policy_violation) blockers.push("POLICY_VIOLATION");
  if (c.high_risk_action_without_approval) blockers.push("HIGH_RISK_ACTION_WITHOUT_APPROVAL");
  if (c.rollback_unavailable_for_disruptive_action) blockers.push("ROLLBACK_UNAVAILABLE_FOR_DISRUPTIVE_ACTION");
  if (c.usage_data_missing_for_removal_action) blockers.push("USAGE_DATA_MISSING_FOR_REMOVAL_ACTION");
  if (c.admin_or_service_account_match) blockers.push("ADMIN_OR_SERVICE_ACCOUNT_MATCH");
  if (impact === "BLOCK") blockers.push("RECONCILIATION_CONFLICT_BLOCK");

  const trustWarnings = [
    ...(r.savings_confidence < 1 ? ["Cost uses non-contract pricing confidence"] : []),
    ...(impact === "WARNING" ? ["RECONCILIATION_WARNING"] : []),
    ...(impact === "DOWNGRADE" ? ["RECONCILIATION_CONFLICT_DOWNGRADE"] : []),
  ];

  return {
    entity_trust_score: Number(entity.toFixed(4)),
    recommendation_trust_score: Number(downgradedRecommendation.toFixed(4)),
    execution_readiness_score: Number(execution.toFixed(4)),
    execution_gate: assignGate(execution, blockers.length > 0, context.mvp_mode ?? true),
    critical_blockers: blockers,
    warnings: trustWarnings,
    score_breakdown: { ...e, entity_trust: entity, ...r, recommendation_trust: downgradedRecommendation, reconciliation_recommended_impact: impact, reconciliation_identity_signal_count: reconciliationSignals?.identitySignals?.length ?? 0, reconciliation_entitlement_signal_count: reconciliationSignals?.entitlementSignals?.length ?? 0, reconciliation_ownership_signal_count: reconciliationSignals?.ownershipSignals?.length ?? 0, reconciliation_conflict_signal_count: reconciliationSignals?.conflictSignals?.length ?? 0, ...x },
  };
}
