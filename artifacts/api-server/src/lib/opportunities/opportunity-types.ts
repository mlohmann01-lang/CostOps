export type OpportunitySource = "TRUST" | "VENDOR_CHANGE" | "DRIFT" | "UTILIZATION" | "RENEWAL" | "BENCHMARK" | "CONTRACT";
export type OpportunityDomain = "M365" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS" | "SALESFORCE" | "SERVICENOW" | "AI_RUNTIME";
export type OpportunityUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OpportunityReadiness = "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED" | "MANUAL_ONLY";
export type OpportunityPriorityBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Opportunity {
  id: string;
  tenantId: string;
  source: OpportunitySource;
  title: string;
  description: string;
  domain: OpportunityDomain;
  projectedMonthlySavings: number;
  trustScore: number;
  confidenceScore: number;
  urgency: OpportunityUrgency;
  readiness: OpportunityReadiness;
  sourceReferenceId: string;
  createdAt: string;
}

export interface RankedOpportunity extends Opportunity {
  rank: number;
  priorityBand: OpportunityPriorityBand;
  score: number;
}

export interface OpportunitySummary {
  openOpportunities: number;
  projectedSavings: number;
  critical: number;
  eligible: number;
}
