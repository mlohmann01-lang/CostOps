import type { Benchmark, BenchmarkImpactLevel, TenantBenchmarkMetric } from "./benchmark-types";

function impactFor(variancePercent: number): BenchmarkImpactLevel {
  const gap = Math.abs(Math.min(0, variancePercent));
  if (gap >= 20) return "HIGH";
  if (gap >= 10) return "MEDIUM";
  return "LOW";
}

export function evaluateBenchmarks(metrics: TenantBenchmarkMetric[]): Benchmark[] {
  return metrics.map((metric) => {
    const variancePercent = Math.round((metric.tenantValue - metric.benchmarkValue) * 100) / 100;
    return { id: `bm-${metric.id}`, tenantId: metric.tenantId, category: metric.category, tenantValue: metric.tenantValue, benchmarkValue: metric.benchmarkValue, variancePercent, impactLevel: impactFor(variancePercent), createdAt: metric.createdAt };
  });
}

export function benchmarkRecoverableValue(benchmark: Benchmark) {
  const gap = Math.abs(Math.min(0, benchmark.variancePercent));
  const impactMultiplier = benchmark.impactLevel === "HIGH" ? 900 : benchmark.impactLevel === "MEDIUM" ? 520 : 180;
  return Math.round(gap * impactMultiplier);
}
