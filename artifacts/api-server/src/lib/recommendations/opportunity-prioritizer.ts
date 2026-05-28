import { rankRecommendations } from "./recommendation-ranking";

const toDays = (d: Date) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));

export function prioritizeRecommendations(rows: any[]) {
  return rankRecommendations(rows, (row) => ({
    projectedAnnualSavings: Number(row.projectedAnnualSavings ?? 0),
    verifiedSavingsHistory: Number(row.verifiedAnnualSavings ?? row.projectedAnnualSavings ?? 0) * 0.6,
    confidenceScore: Number(row.confidenceScore ?? 0),
    reliabilityBand: String(row.reliabilityBand ?? "LOW"),
    lifecycleState: String(row.recommendationState ?? "UNKNOWN"),
    executionReadiness: String(row.executionReadiness ?? "MANUAL_ONLY"),
    riskClass: String(row.actionRiskClass ?? "D"),
    rollbackSupport: !(Array.isArray(row.blockedReasons) && row.blockedReasons.some((x: string) => /NO_ROLLBACK|irreversible/i.test(x))),
    driftLikelihood: Array.isArray(row.readinessReasons) && row.readinessReasons.some((x: string) => /drift/i.test(x)) ? 0.8 : 0.3,
    policyComplexity: Array.isArray(row.requiredApprovals) ? Math.min(1, row.requiredApprovals.length / 4) : 0.25,
    recommendationAgeDays: toDays(row.createdAt),
    playbookType: String(row.playbookId ?? "UNKNOWN"),
    executionFeasibility: row.executionReadiness === "AUTO_EXECUTE_ELIGIBLE" ? 90 : row.executionReadiness === "EXECUTION_READY" ? 78 : row.executionReadiness === "APPROVAL_REQUIRED" ? 58 : 35,
  }));
}
