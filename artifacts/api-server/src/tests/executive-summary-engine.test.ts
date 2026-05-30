import test from "node:test";
import assert from "node:assert/strict";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { prioritizeExecutiveOpportunities } from "../lib/prioritization/executive-prioritization-engine";
import { buildExecutiveSummary } from "../lib/prioritization/executive-summary-engine";

test("top five summary calculation includes savings, counts, confidence, and narrative", () => {
  const repo = new OpportunityRepository();
  const priorities = prioritizeExecutiveOpportunities(repo.list("tenant-summary"));
  const summary = buildExecutiveSummary("tenant-summary", priorities);
  assert.equal(summary.totalOpportunities, priorities.length);
  assert.equal(summary.topFiveMonthlySavings, priorities.slice(0, 5).reduce((sum, priority) => sum + priority.projectedMonthlySavings, 0));
  assert.equal(summary.topFiveAnnualSavings, summary.topFiveMonthlySavings * 12);
  assert.ok(summary.executionReadinessPercent > 0);
  assert.equal(summary.summaryNarrative.includes("top 5 opportunities"), true);
});
