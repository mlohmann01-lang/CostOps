import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBenchmarks } from "../lib/benchmarks/benchmark-engine";

test("detects benchmark gaps and impact levels", () => {
  const [benchmark] = evaluateBenchmarks([{ id: "copilot", tenantId: "tenant-a", category: "COPILOT_ADOPTION", tenantValue: 18, benchmarkValue: 42, createdAt: "2026-05-30T00:00:00.000Z" }]);
  assert.equal(benchmark.variancePercent, -24);
  assert.equal(benchmark.impactLevel, "HIGH");
  assert.equal(benchmark.tenantId, "tenant-a");
});

test("positive variance is low impact", () => {
  const [benchmark] = evaluateBenchmarks([{ id: "aws", tenantId: "tenant-a", category: "AWS_EFFICIENCY", tenantValue: 90, benchmarkValue: 84, createdAt: "2026-05-30T00:00:00.000Z" }]);
  assert.equal(benchmark.variancePercent, 6);
  assert.equal(benchmark.impactLevel, "LOW");
});
