import test from "node:test";
import assert from "node:assert/strict";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { prioritizeExecutiveOpportunities } from "../lib/prioritization/executive-prioritization-engine";
import { buildExecutiveSummary } from "../lib/prioritization/executive-summary-engine";

test("top five summary calculation includes savings, counts, confidence, and narrative", async () => {
  const repo = new OpportunityRepository();
  repo.upsertMany("tenant-summary", Array.from({ length: 6 }, (_, i) => ({
    id: `opp-${i}`, tenantId: "tenant-summary", source: "TRUST", sourceReferenceId: `opp-${i}`, title: `Opportunity ${i}`, description: "test fixture",
    domain: "AWS", projectedMonthlySavings: 1000 + i * 100, projectedAnnualSavings: (1000 + i * 100) * 12, confidenceScore: 80, trustScore: 80,
    readiness: i % 2 === 0 ? "ELIGIBLE" : "APPROVAL_REQUIRED", status: "DISCOVERED", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", urgency: "MEDIUM",
  })));
  const priorities = prioritizeExecutiveOpportunities(repo.list("tenant-summary"));
  const summary = buildExecutiveSummary("tenant-summary", priorities);
  assert.equal(summary.totalOpportunities, priorities.length);
  assert.equal(summary.topFiveMonthlySavings, priorities.slice(0, 5).reduce((sum, priority) => sum + priority.projectedMonthlySavings, 0));
  assert.equal(summary.topFiveAnnualSavings, summary.topFiveMonthlySavings * 12);
  assert.ok(summary.executionReadinessPercent > 0);
  assert.equal(summary.summaryNarrative.includes("top 5 opportunities"), true);
});
