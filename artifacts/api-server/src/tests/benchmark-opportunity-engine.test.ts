import test from "node:test";
import assert from "node:assert/strict";
import { generateBenchmarkOpportunities } from "../lib/benchmarks/benchmark-opportunity-engine";
import { BenchmarkRepository } from "../lib/benchmarks/benchmark-repository";
import { buildOpportunities } from "../lib/opportunities/opportunity-factory";

test("generates benchmark opportunities", () => {
  const repo = new BenchmarkRepository();
  repo.clearForTests();
  const opportunities = generateBenchmarkOpportunities(repo.list("tenant-a"));
  assert.ok(opportunities.some((opportunity) => opportunity.title === "Copilot Utilization Campaign"));
  assert.ok(opportunities.some((opportunity) => opportunity.title === "M365 Rightsizing Opportunity"));
  assert.ok(opportunities.every((opportunity) => opportunity.source === "BENCHMARK"));
});

test("benchmark opportunities feed opportunity factory", () => {
  const repo = new BenchmarkRepository();
  repo.clearForTests();
  const opportunities = buildOpportunities({ benchmarkOpportunities: generateBenchmarkOpportunities(repo.list("tenant-a")) });
  assert.ok(opportunities.length > 0);
  assert.equal(opportunities[0].source, "BENCHMARK");
});
