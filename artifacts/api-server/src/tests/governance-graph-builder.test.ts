import test from "node:test";
import assert from "node:assert/strict";
import { buildGovernanceGraph } from "../lib/governance-graph/governance-graph-builder";
import { demoGovernanceGraphInput } from "../lib/governance-graph/governance-graph-demo-data";

test("governance graph builder creates canonical nodes and edges", () => {
  const graph = buildGovernanceGraph(demoGovernanceGraphInput);
  for (const type of ["VENDOR", "APPLICATION", "OWNER", "FINDING", "RISK", "OPPORTUNITY", "EVIDENCE", "DOMAIN", "COST", "RENEWAL"]) assert.ok(graph.nodes.some((node) => node.type === type), type);
  for (const type of ["OWNS_APPLICATION", "HAS_OWNER", "HAS_FINDING", "SUPPORTED_BY_EVIDENCE", "SOURCED_FROM_DOMAIN"]) assert.ok(graph.edges.some((edge) => edge.type === type), type);
});

test("governance graph builder deduplicates stable nodes and calculates summary", () => {
  const graph = buildGovernanceGraph({ applications: [demoGovernanceGraphInput.applications[0], demoGovernanceGraphInput.applications[0]] });
  assert.equal(graph.nodes.filter((node) => node.id === "application:slack").length, 1);
  assert.ok(graph.summary.vendors > 0);
  assert.ok(graph.summary.applications > 0);
  assert.ok(graph.summary.annualCostMapped > 0);
  assert.ok(graph.summary.potentialAnnualSavingsMapped > 0);
});
