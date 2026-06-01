import test from "node:test";
import assert from "node:assert/strict";
import { deduplicateOpportunities } from "../lib/opportunity-factory/opportunity-factory-service";
import { normalizeOpportunity } from "../lib/opportunity-factory/opportunity-normalizer";

test("dedupe merges same source reference and keeps highest confidence", () => {
  const a = normalizeOpportunity({ id: "opp-a", source: "UTILIZATION", sourceReferenceId: "util-1", title: "A", projectedMonthlySavings: 100, confidenceScore: 70, evidence: ["a"] }, "t1");
  const b = normalizeOpportunity({ id: "opp-b", source: "UTILIZATION", sourceReferenceId: "util-1", title: "B", projectedMonthlySavings: 200, confidenceScore: 90, evidence: ["b"] }, "t1");
  const result = deduplicateOpportunities([a, b]);
  assert.equal(result.deduplicated, 1);
  assert.equal(result.opportunities.length, 1);
  assert.equal(result.opportunities[0].title, "B");
  assert.equal(result.opportunities[0].projectedMonthlySavings, 200);
  assert.deepEqual(result.opportunities[0].evidence, ["a", "b"]);
});

test("dedupe merges same cost object and recommendation", () => {
  const a = normalizeOpportunity({ id: "opp-a", source: "CONTRACT", sourceReferenceId: "con-1", title: "Rightsize", entityKey: "entity-1", recommendationKey: "rightsizing", costObjectKey: "m365" }, "t1");
  const b = normalizeOpportunity({ id: "opp-b", source: "BENCHMARK", sourceReferenceId: "bench-1", title: "Rightsize", entityKey: "entity-1", recommendationKey: "rightsizing", costObjectKey: "m365" }, "t1");
  const result = deduplicateOpportunities([a, b]);
  assert.equal(result.opportunities.length, 1);
  assert.deepEqual(result.opportunities[0].sources?.sort(), ["BENCHMARK", "CONTRACT"]);
});
