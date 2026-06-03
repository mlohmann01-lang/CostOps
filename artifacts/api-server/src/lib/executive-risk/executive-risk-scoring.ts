import type { ExecutiveRiskItem, ExecutiveRiskLevel } from "./executive-risk-types";
const base: Record<ExecutiveRiskLevel, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 95 };
export function scoreExecutiveRisk(input: Omit<ExecutiveRiskItem, "riskScore"> & { riskScore?: number }): number {
  let score = base[input.riskLevel];
  if ((input.annualCostExposure ?? 0) > 100000) score += 10;
  if (typeof input.daysToRenewal === "number" && input.daysToRenewal <= 90) score += 10;
  if (input.ownerMissing) score += 10;
  if (input.domain === "AI_GOVERNANCE") score += 10;
  if ((input.affectedUsers ?? 0) > 25) score += 5;
  return Math.min(100, score);
}
