import type { ExecutiveRiskItem } from "./executive-risk-types";
export function prioritiseExecutiveRisks(risks: ExecutiveRiskItem[], limit = 10): ExecutiveRiskItem[] {
  return [...risks].sort((a, b) => b.riskScore - a.riskScore || (a.daysToRenewal ?? 9999) - (b.daysToRenewal ?? 9999) || (b.annualCostExposure ?? 0) - (a.annualCostExposure ?? 0) || (b.affectedUsers ?? 0) - (a.affectedUsers ?? 0)).slice(0, limit);
}
