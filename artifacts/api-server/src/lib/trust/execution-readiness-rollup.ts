import type { ExecutionReadinessRollup, ReadinessCategory, TrustRecommendation } from "./trust-types";

const labels: Record<ReadinessCategory, string> = {
  EXECUTION_ELIGIBLE: "Execution Eligible",
  APPROVAL_REQUIRED: "Approval Required",
  BLOCKED_BY_TRUST: "Blocked By Trust",
  BLOCKED_BY_POLICY: "Blocked By Policy",
  MANUAL_ONLY: "Manual Only",
};

function annualValue(rec: TrustRecommendation): number {
  if (typeof rec.projectedAnnualSavings === "number" && Number.isFinite(rec.projectedAnnualSavings)) return Math.max(0, rec.projectedAnnualSavings);
  if (typeof rec.projectedMonthlySavings === "number" && Number.isFinite(rec.projectedMonthlySavings)) return Math.max(0, rec.projectedMonthlySavings * 12);
  return 0;
}

function hasAny(reasons: string[], patterns: RegExp[]) {
  return reasons.some((reason) => patterns.some((pattern) => pattern.test(reason)));
}

export function classifyExecutionReadiness(rec: TrustRecommendation): ReadinessCategory {
  const readiness = String(rec.executionReadiness ?? rec.recommendationState ?? "").toUpperCase();
  const reasons = [...(rec.blockedReasons ?? []), ...(rec.readinessReasons ?? [])].map((reason) => String(reason).toUpperCase());
  if (hasAny(reasons, [/POLICY/, /GOVERNANCE_BLOCK/, /DENIED/])) return "BLOCKED_BY_POLICY";
  if (hasAny(reasons, [/TRUST/, /EVIDENCE/, /FRESH/, /IDENTITY/, /OWNER/, /OWNERSHIP/, /STALE/, /CONFIDENCE/, /ENTITLEMENT/])) return "BLOCKED_BY_TRUST";
  if (readiness.includes("POLICY")) return "BLOCKED_BY_POLICY";
  if (readiness.includes("MANUAL") || readiness.includes("NEVER_ELIGIBLE")) return "MANUAL_ONLY";
  if (readiness.includes("APPROVAL")) return "APPROVAL_REQUIRED";
  if (readiness.includes("READY_FOR_EXECUTION") || readiness.includes("EXECUTION_READY") || readiness === "READY") return "EXECUTION_ELIGIBLE";
  if (readiness.includes("BLOCK")) return "BLOCKED_BY_TRUST";
  return "MANUAL_ONLY";
}

export function rollupExecutionReadiness(recommendations: TrustRecommendation[]): ExecutionReadinessRollup {
  const rows = (Object.keys(labels) as ReadinessCategory[]).map((category) => ({ category, label: labels[category], value: 0, recommendationCount: 0, reasons: [] as string[] }));
  const byCategory = new Map(rows.map((row) => [row.category, row]));
  for (const rec of recommendations) {
    const category = classifyExecutionReadiness(rec);
    const row = byCategory.get(category)!;
    row.value += annualValue(rec);
    row.recommendationCount += 1;
    const reason = [...(rec.blockedReasons ?? []), ...(rec.readinessReasons ?? [])][0];
    if (reason && !row.reasons.includes(reason)) row.reasons.push(reason);
  }
  return {
    executionEligibleValue: byCategory.get("EXECUTION_ELIGIBLE")!.value,
    approvalRequiredValue: byCategory.get("APPROVAL_REQUIRED")!.value,
    blockedByTrustValue: byCategory.get("BLOCKED_BY_TRUST")!.value,
    blockedByPolicyValue: byCategory.get("BLOCKED_BY_POLICY")!.value,
    manualOnlyValue: byCategory.get("MANUAL_ONLY")!.value,
    breakdown: rows,
  };
}
