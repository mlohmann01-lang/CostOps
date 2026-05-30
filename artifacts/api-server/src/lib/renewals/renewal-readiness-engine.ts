import type { Renewal, RenewalReadiness } from "./renewal-types";

const recoverableRate: Record<Renewal["vendor"], number> = { MICROSOFT: 0.162, AWS: 0.09, AZURE: 0.1, SNOWFLAKE: 0.078, DATABRICKS: 0.085, SERVICENOW: 0.11, SALESFORCE: 0.07, ADOBE: 0.06 };

export function calculateRenewalReadiness(renewal: Renewal): RenewalReadiness {
  const urgencyBoost = renewal.daysRemaining <= 45 ? 18 : renewal.daysRemaining <= 90 ? 12 : renewal.daysRemaining <= 120 ? 6 : 0;
  const riskPenalty = renewal.renewalRisk === "HIGH" ? 18 : renewal.renewalRisk === "MEDIUM" ? 8 : 0;
  const recoverableSpend = Math.round(renewal.annualSpend * (recoverableRate[renewal.vendor] ?? 0.08));
  const wasteIdentified = Math.round(recoverableSpend * 1.18);
  const readinessScore = Math.max(35, Math.min(96, 78 + urgencyBoost - riskPenalty));
  const recommendedActions = Math.max(3, Math.round(recoverableSpend / 10000));
  const negotiationLeverage = recoverableSpend / renewal.annualSpend >= 0.14 || renewal.renewalRisk === "HIGH" ? "HIGH" : recoverableSpend / renewal.annualSpend >= 0.08 ? "MEDIUM" : "LOW";
  return { renewalId: renewal.id, readinessScore, wasteIdentified, recoverableSpend, projectedSavings: recoverableSpend, recommendedActions, negotiationLeverage };
}
