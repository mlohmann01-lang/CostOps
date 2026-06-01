import test from "node:test";
import assert from "node:assert/strict";
import { prioritizeExecutiveOpportunities } from "../lib/prioritization/executive-prioritization-engine";
import type { Opportunity } from "../lib/opportunities/opportunity-types";

const base: Opportunity = { id: "base", tenantId: "t1", source: "UTILIZATION", title: "Base", description: "Base", domain: "M365", projectedMonthlySavings: 1000, trustScore: 80, confidenceScore: 80, urgency: "MEDIUM", readiness: "ELIGIBLE", sourceReferenceId: "src", projectedAnnualSavings: 12000, status: "DISCOVERED", createdAt: "2026-05-30T12:00:00.000Z", updatedAt: "2026-05-30T12:00:00.000Z" };

test("scoring uses value, readiness, trust, confidence, strategic importance, ease, and time", () => {
  const priorities = prioritizeExecutiveOpportunities([{ ...base, id: "a", title: "High value", projectedMonthlySavings: 10000, readiness: "ELIGIBLE", trustScore: 90, confidenceScore: 90, source: "DRIFT" }, { ...base, id: "b", title: "Low value", projectedMonthlySavings: 1000, readiness: "MANUAL_ONLY", trustScore: 55, confidenceScore: 65, source: "BENCHMARK" }]);
  assert.equal(priorities[0].title, "High value");
  assert.ok(priorities[0].executiveScore > priorities[1].executiveScore);
  assert.ok(priorities[0].rationale.includes("Ready for execution"));
});

test("blocked opportunities are penalized and high value approval-required can outrank low value eligible", () => {
  const priorities = prioritizeExecutiveOpportunities([{ ...base, id: "blocked", title: "Blocked", projectedMonthlySavings: 20000, readiness: "BLOCKED", urgency: "CRITICAL" }, { ...base, id: "approval", title: "Approval", projectedMonthlySavings: 15000, readiness: "APPROVAL_REQUIRED", source: "CONTRACT" }, { ...base, id: "eligible", title: "Eligible", projectedMonthlySavings: 1200, readiness: "ELIGIBLE" }]);
  assert.equal(priorities[0].title, "Approval");
  assert.ok(priorities.find((p) => p.title === "Blocked")?.rationale.includes("Blocked by readiness constraints"));
});

test("ranking is deterministic with score tie-breakers", () => {
  const priorities = prioritizeExecutiveOpportunities([{ ...base, id: "b", title: "Beta", projectedMonthlySavings: 5000 }, { ...base, id: "a", title: "Alpha", projectedMonthlySavings: 5000 }]);
  assert.equal(priorities[0].title, "Alpha");
  assert.deepEqual(priorities.map((priority) => priority.priorityRank), [1, 2]);
});
