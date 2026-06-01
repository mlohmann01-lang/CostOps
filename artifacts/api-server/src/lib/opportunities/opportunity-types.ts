export type OpportunitySource = "TRUST" | "VENDOR_CHANGE" | "DRIFT" | "UTILIZATION" | "RENEWAL" | "BENCHMARK" | "CONTRACT" | "M365_PLAYBOOK";
export type OpportunityDomain = "M365" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS" | "SALESFORCE" | "SERVICENOW" | "AI_RUNTIME";
export type OpportunityUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OpportunityReadiness = "ELIGIBLE" | "APPROVAL_REQUIRED" | "BLOCKED" | "MANUAL_ONLY";
export type OpportunityStatus = "DISCOVERED" | "PRIORITIZED" | "APPROVAL_PENDING" | "APPROVED" | "EXECUTING" | "EXECUTED" | "VERIFIED" | "DRIFTED" | "CLOSED";
export type OpportunityPriorityBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Opportunity {
  id: string;
  tenantId: string;
  source: OpportunitySource;
  sourceReferenceId: string;
  title: string;
  description: string;
  domain: OpportunityDomain;
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  confidenceScore: number;
  trustScore: number;
  readiness: OpportunityReadiness;
  status: OpportunityStatus;
  createdAt: string;
  updatedAt: string;
  urgency: OpportunityUrgency;
  sources?: OpportunitySource[];
  reasons?: string[];
  evidence?: unknown[];
  entityKey?: string;
  recommendationKey?: string;
  costObjectKey?: string;
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
  discovered: number;
  prioritized: number;
  approvalPending: number;
  readyForExecution: number;
}
