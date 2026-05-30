import type { Opportunity } from "../opportunities/opportunity-types";

export type BenchmarkCategory = "COPILOT_ADOPTION" | "M365_UTILIZATION" | "AWS_EFFICIENCY" | "SNOWFLAKE_EFFICIENCY" | "DATABRICKS_EFFICIENCY" | "SALESFORCE_UTILIZATION" | "AI_RUNTIME_EFFICIENCY";
export type BenchmarkImpactLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Benchmark {
  id: string;
  tenantId: string;
  category: BenchmarkCategory;
  tenantValue: number;
  benchmarkValue: number;
  variancePercent: number;
  impactLevel: BenchmarkImpactLevel;
  createdAt: string;
}

export interface BenchmarkOpportunity extends Opportunity {
  source: "BENCHMARK";
  benchmarkId: string;
  variancePercent: number;
}

export interface BenchmarkSummary {
  benchmarksEvaluated: number;
  highImpactGaps: number;
  recoverableValue: number;
  generatedOpportunities: number;
}

export type TenantBenchmarkMetric = {
  id: string;
  tenantId: string;
  category: BenchmarkCategory;
  tenantValue: number;
  benchmarkValue: number;
  createdAt: string;
};
