import test from "node:test";
import assert from "node:assert/strict";
import { priorityBand, rankOpportunities, scoreOpportunity } from "../lib/opportunities/opportunity-prioritizer";
import type { Opportunity } from "../lib/opportunities/opportunity-types";

function opp(id: string, savings: number, urgency: Opportunity["urgency"]): Opportunity { return { id, tenantId: "tenant-a", source: "TRUST", title: id, description: id, domain: "M365", projectedMonthlySavings: savings, trustScore: 80, confidenceScore: 80, urgency, readiness: "ELIGIBLE", sourceReferenceId: id, createdAt: "2026-05-30T00:00:00.000Z" }; }

test("scores opportunity using savings, trust, confidence, and urgency", () => {
  const score = scoreOpportunity(opp("critical", 20000, "CRITICAL"));
  assert.ok(score >= 90);
  assert.equal(priorityBand(score), "CRITICAL");
});

test("ranks opportunities by score descending", () => {
  const rows = rankOpportunities([opp("low", 1000, "LOW"), opp("high", 20000, "CRITICAL")]);
  assert.equal(rows[0].id, "high");
  assert.equal(rows[0].rank, 1);
  assert.ok(rows[0].score >= rows[1].score);
});
