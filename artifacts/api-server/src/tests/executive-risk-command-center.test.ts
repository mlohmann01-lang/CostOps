import test from "node:test";
import assert from "node:assert/strict";
import { buildGovernanceGraph } from "../lib/governance-graph/governance-graph-builder";
import { demoGovernanceGraphInput } from "../lib/governance-graph/governance-graph-demo-data";
import { buildExecutiveRiskCommandCenter } from "../lib/executive-risk/executive-risk-command-center";

test("executive command center calculates summary and narrative", () => {
  const result = buildExecutiveRiskCommandCenter(buildGovernanceGraph(demoGovernanceGraphInput));
  assert.ok(result.summary.portfolioRiskScore > 0);
  assert.ok(result.summary.ownerlessSpend > 0);
  assert.ok(result.summary.renewalsAtRisk > 0);
  assert.ok(result.summary.aiGovernanceGaps > 0);
  assert.ok(result.summary.potentialAnnualSavings > 0);
  assert.ok(["HIGH", "MEDIUM", "LOW"].includes(result.summary.evidenceConfidence));
  assert.ok(result.executiveNarrative.includes("highest-priority governance issues"));
  assert.ok(result.topRisks.length <= 10);
});
