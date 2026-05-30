import type { OpportunityDomain, OpportunityReadiness, OpportunitySource } from "../opportunities/opportunity-types";

export type ExecutivePriorityBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ExecutionEase = "EASY" | "MODERATE" | "HARD";
export type TimeToRealize = "IMMEDIATE" | "SHORT" | "MEDIUM" | "LONG";
export type StrategicImportance = "LOW" | "MEDIUM" | "HIGH";
export type ExecutiveRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ExecutiveConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export interface ExecutivePriority {
  priorityId: string;
  tenantId: string;
  opportunityId: string;
  title: string;
  source: OpportunitySource;
  domain: OpportunityDomain;
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  trustScore: number;
  confidenceScore: number;
  readiness: OpportunityReadiness;
  riskLevel: ExecutiveRiskLevel;
  executionEase: ExecutionEase;
  timeToRealize: TimeToRealize;
  strategicImportance: StrategicImportance;
  executiveScore: number;
  priorityBand: ExecutivePriorityBand;
  priorityRank: number;
  rationale: string[];
  recommendedNextAction: string;
  createdAt: string;
}

export interface ExecutiveSummary {
  tenantId: string;
  totalOpportunities: number;
  topFiveMonthlySavings: number;
  topFiveAnnualSavings: number;
  readyNowCount: number;
  approvalRequiredCount: number;
  blockedCount: number;
  averageTrustScore: number;
  confidenceBand: ExecutiveConfidenceBand;
  executionReadinessPercent: number;
  topOpportunityTitle: string;
  topOpportunityValue: number;
  summaryNarrative: string;
  generatedAt: string;
}
