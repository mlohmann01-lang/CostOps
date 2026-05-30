import type { Benchmark, BenchmarkOpportunity } from "./benchmark-types";
import { benchmarkRecoverableValue } from "./benchmark-engine";

function titleFor(benchmark: Benchmark) {
  const labels: Record<Benchmark["category"], string> = { COPILOT_ADOPTION: "Copilot Utilization Campaign", M365_UTILIZATION: "M365 Rightsizing Opportunity", AWS_EFFICIENCY: "AWS Efficiency Opportunity", SNOWFLAKE_EFFICIENCY: "Snowflake Efficiency Opportunity", DATABRICKS_EFFICIENCY: "Databricks Efficiency Opportunity", SALESFORCE_UTILIZATION: "Salesforce Utilization Opportunity", AI_RUNTIME_EFFICIENCY: "AI Runtime Cost Efficiency Opportunity" };
  return labels[benchmark.category];
}

function domainFor(benchmark: Benchmark): BenchmarkOpportunity["domain"] {
  if (benchmark.category.includes("AWS")) return "AWS";
  if (benchmark.category.includes("SNOWFLAKE")) return "SNOWFLAKE";
  if (benchmark.category.includes("DATABRICKS")) return "DATABRICKS";
  if (benchmark.category.includes("SALESFORCE")) return "SALESFORCE";
  if (benchmark.category.includes("AI_RUNTIME")) return "AI_RUNTIME";
  return "M365";
}

export function generateBenchmarkOpportunities(benchmarks: Benchmark[]): BenchmarkOpportunity[] {
  return benchmarks.filter((benchmark) => benchmark.variancePercent < 0).map((benchmark) => ({ id: `opp-benchmark-${benchmark.id}`, tenantId: benchmark.tenantId, source: "BENCHMARK", benchmarkId: benchmark.id, title: titleFor(benchmark), description: `${benchmark.category.replaceAll("_", " ")} is ${Math.abs(benchmark.variancePercent)} points below peer benchmark.`, domain: domainFor(benchmark), projectedMonthlySavings: Math.round(benchmarkRecoverableValue(benchmark) / 12), trustScore: benchmark.impactLevel === "HIGH" ? 78 : 72, confidenceScore: benchmark.impactLevel === "HIGH" ? 84 : 76, urgency: benchmark.impactLevel === "HIGH" ? "HIGH" : benchmark.impactLevel === "MEDIUM" ? "MEDIUM" : "LOW", readiness: benchmark.impactLevel === "HIGH" ? "APPROVAL_REQUIRED" : "ELIGIBLE", sourceReferenceId: benchmark.id, createdAt: benchmark.createdAt, variancePercent: benchmark.variancePercent }));
}
