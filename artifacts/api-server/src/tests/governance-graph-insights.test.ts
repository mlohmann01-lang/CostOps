import test from "node:test";
import assert from "node:assert/strict";
import { buildGovernanceGraph } from "../lib/governance-graph/governance-graph-builder";
import { demoGovernanceGraphInput } from "../lib/governance-graph/governance-graph-demo-data";

test("governance graph insights include required relationship insights", () => {
  const graph = buildGovernanceGraph(demoGovernanceGraphInput);
  const types = graph.insights.map((insight) => insight.type);
  for (const expected of ["OWNERLESS_HIGH_SPEND", "MULTI_DOMAIN_RISK", "DUPLICATE_CAPABILITY_CLUSTER", "AI_GOVERNANCE_CLUSTER", "RENEWAL_RISK_CLUSTER", "HIGH_VALUE_OPPORTUNITY"] as const) assert.ok(types.includes(expected), expected);
});
