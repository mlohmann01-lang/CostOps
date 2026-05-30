import type { Benchmark, TenantBenchmarkMetric } from "./benchmark-types";
import { evaluateBenchmarks } from "./benchmark-engine";

const createdAt = "2026-05-30T12:00:00.000Z";
const seedMetrics: Omit<TenantBenchmarkMetric, "tenantId" | "createdAt">[] = [
  { id: "copilot-adoption", category: "COPILOT_ADOPTION", tenantValue: 18, benchmarkValue: 42 },
  { id: "e5-utilization", category: "M365_UTILIZATION", tenantValue: 31, benchmarkValue: 54 },
  { id: "snowflake-efficiency", category: "SNOWFLAKE_EFFICIENCY", tenantValue: 61, benchmarkValue: 78 },
  { id: "aws-efficiency", category: "AWS_EFFICIENCY", tenantValue: 73, benchmarkValue: 84 },
  { id: "ai-runtime-efficiency", category: "AI_RUNTIME_EFFICIENCY", tenantValue: 64, benchmarkValue: 81 },
  { id: "databricks-efficiency", category: "DATABRICKS_EFFICIENCY", tenantValue: 69, benchmarkValue: 83 },
  { id: "salesforce-utilization", category: "SALESFORCE_UTILIZATION", tenantValue: 58, benchmarkValue: 74 },
];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class BenchmarkRepository {
  private static rows = new Map<string, Benchmark>();
  constructor() { this.ensureTenant("default"); }
  ensureTenant(tenantId: string) {
    const metrics = seedMetrics.map((metric) => ({ ...clone(metric), tenantId, createdAt }));
    for (const benchmark of evaluateBenchmarks(metrics)) {
      const key = this.key(tenantId, benchmark.id);
      if (!BenchmarkRepository.rows.has(key)) BenchmarkRepository.rows.set(key, benchmark);
    }
  }
  list(tenantId: string) { this.ensureTenant(tenantId); return Array.from(BenchmarkRepository.rows.values()).filter((row) => row.tenantId === tenantId).sort((a, b) => a.variancePercent - b.variancePercent); }
  highImpact(tenantId: string) { return this.list(tenantId).filter((row) => row.impactLevel === "HIGH"); }
  getById(tenantId: string, id: string) { return this.list(tenantId).find((row) => row.id === id) ?? null; }
  clearForTests() { BenchmarkRepository.rows.clear(); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
}
