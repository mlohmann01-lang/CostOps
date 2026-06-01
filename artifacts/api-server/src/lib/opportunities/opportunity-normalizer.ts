import type { Opportunity, OpportunityDomain, OpportunityReadiness, OpportunityUrgency } from "./opportunity-types";
import type { TrustFinding } from "../trust/trust-types";
import type { StoredVendorChangeEvent } from "../vcde/vendor-change-types";
import type { RenewalOpportunity } from "../renewals/renewal-types";

export type DriftAlert = { id: string; tenantId: string; title: string; description?: string; domain?: string; affectedValue?: number; severity?: string; detectedAt?: string };

function domainFrom(value: string | undefined): OpportunityDomain {
  const raw = String(value ?? "M365").toUpperCase();
  if (raw.includes("AWS")) return "AWS";
  if (raw.includes("AZURE")) return "AZURE";
  if (raw.includes("SNOWFLAKE")) return "SNOWFLAKE";
  if (raw.includes("DATABRICKS")) return "DATABRICKS";
  if (raw.includes("SALESFORCE")) return "SALESFORCE";
  if (raw.includes("SERVICENOW")) return "SERVICENOW";
  if (raw.includes("OPENAI") || raw.includes("AI")) return "AI_RUNTIME";
  return "M365";
}

function urgencyFrom(severity: string | undefined): OpportunityUrgency {
  const value = String(severity ?? "MEDIUM").toUpperCase();
  if (value === "CRITICAL") return "CRITICAL";
  if (value === "HIGH") return "HIGH";
  if (value === "LOW") return "LOW";
  return "MEDIUM";
}

function readinessFromFinding(finding: TrustFinding): OpportunityReadiness {
  if (finding.findingType === "POLICY_BLOCKED") return "APPROVAL_REQUIRED";
  if (finding.status === "RESOLVED") return "ELIGIBLE";
  return "BLOCKED";
}

export function trustFindingToOpportunity(finding: TrustFinding): Opportunity {
  return { id: `opp-trust-${finding.findingId}`, tenantId: finding.tenantId, source: "TRUST", title: `${String(finding.findingType).replaceAll("_", " ")} resolution`, description: finding.description, domain: domainFrom(finding.sourceSystem), projectedMonthlySavings: Math.round(Number(finding.affectedValue ?? 0) / 12), trustScore: finding.severity === "HIGH" ? 58 : 68, confidenceScore: 72, urgency: urgencyFrom(finding.severity), readiness: readinessFromFinding(finding), sourceReferenceId: finding.findingId, status: "DISCOVERED", createdAt: finding.detectedAt, updatedAt: new Date().toISOString(), projectedAnnualSavings: Math.round(Number(finding.affectedValue ?? 0)) };
}

export function vendorChangeToOpportunity(change: StoredVendorChangeEvent): Opportunity {
  return { id: `opp-vendor-${change.id}`, tenantId: change.tenantId, source: "VENDOR_CHANGE", title: change.title.includes("Copilot") ? "Copilot License Reclaim" : change.title, description: change.description, domain: domainFrom(change.vendor), projectedMonthlySavings: Math.round(change.affectedSpend * (change.impactSeverity === "HIGH" || change.impactSeverity === "CRITICAL" ? 0.56 : 0.13)), trustScore: 82, confidenceScore: change.status === "ASSESSED" || change.status === "ACTIONED" ? 84 : 76, urgency: urgencyFrom(change.impactSeverity), readiness: change.impactSeverity === "HIGH" || change.impactSeverity === "CRITICAL" ? "APPROVAL_REQUIRED" : "ELIGIBLE", sourceReferenceId: change.id, status: "DISCOVERED", createdAt: change.detectedAt, updatedAt: new Date().toISOString(), projectedAnnualSavings: Math.round(change.affectedSpend * (change.impactSeverity === "HIGH" || change.impactSeverity === "CRITICAL" ? 0.56 : 0.13) * 12) };
}

export function driftAlertToOpportunity(alert: DriftAlert): Opportunity {
  return { id: `opp-drift-${alert.id}`, tenantId: alert.tenantId, source: "DRIFT", title: alert.title, description: alert.description ?? "Drift detected and should be reviewed for renewed savings opportunity.", domain: domainFrom(alert.domain), projectedMonthlySavings: Math.round(Number(alert.affectedValue ?? 0) / 12), trustScore: 74, confidenceScore: 78, urgency: urgencyFrom(alert.severity), readiness: "APPROVAL_REQUIRED", sourceReferenceId: alert.id, status: "DRIFTED", createdAt: alert.detectedAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), projectedAnnualSavings: Math.round(Number(alert.affectedValue ?? 0)) };
}

export function renewalOpportunityToOpportunity(opportunity: RenewalOpportunity): Opportunity {
  const { renewalId: _renewalId, negotiationLeverage: _negotiationLeverage, ...canonical } = opportunity;
  return canonical;
}
