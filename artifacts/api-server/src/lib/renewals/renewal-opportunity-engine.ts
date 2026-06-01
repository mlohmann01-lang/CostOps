import type { Renewal, RenewalOpportunity, RenewalReadiness } from "./renewal-types";

function domainFor(vendor: Renewal["vendor"]): RenewalOpportunity["domain"] {
  if (vendor === "MICROSOFT") return "M365";
  if (vendor === "AWS") return "AWS";
  if (vendor === "AZURE") return "AZURE";
  if (vendor === "SNOWFLAKE") return "SNOWFLAKE";
  if (vendor === "DATABRICKS") return "DATABRICKS";
  if (vendor === "SALESFORCE") return "SALESFORCE";
  if (vendor === "SERVICENOW") return "SERVICENOW";
  return "M365";
}

export function generateRenewalOpportunities(renewal: Renewal, readiness: RenewalReadiness): RenewalOpportunity[] {
  const actions = ["Unused license cleanup", "Inactive user reclaim", "Copilot under-utilization review", "Rightsizing", "Vendor change impact review", "Drift finding review", "Trust finding resolution"].slice(0, readiness.recommendedActions);
  return actions.map((action, index) => ({ id: `opp-renewal-${renewal.id}-${index + 1}`, tenantId: renewal.tenantId, source: "RENEWAL", renewalId: renewal.id, title: `${renewal.contractName} ${action}`, description: `${action} before ${renewal.contractName} renewal to improve negotiation leverage.`, domain: domainFor(renewal.vendor), projectedMonthlySavings: Math.round(readiness.projectedSavings / Math.max(1, actions.length) / 12), projectedAnnualSavings: Math.round(readiness.projectedSavings / Math.max(1, actions.length)), trustScore: readiness.readinessScore, confidenceScore: readiness.negotiationLeverage === "HIGH" ? 86 : readiness.negotiationLeverage === "MEDIUM" ? 76 : 66, urgency: renewal.daysRemaining <= 45 ? "CRITICAL" : renewal.daysRemaining <= 90 ? "HIGH" : "MEDIUM", readiness: readiness.readinessScore >= 75 ? "APPROVAL_REQUIRED" : "BLOCKED", sourceReferenceId: renewal.id, status: "DISCOVERED", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), negotiationLeverage: readiness.negotiationLeverage }));
}
