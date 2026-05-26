import test from "node:test";
import assert from "node:assert/strict";
import { CANONICAL_GRAPH_ENTITY_TYPES, CANONICAL_RELATIONSHIP_TYPES } from "../lib/operational-graph/types";
import { buildLineage } from "../lib/operational-graph/lineage";

test("graph entity and relationship enums include required canonical values", () => {
  assert.equal(CANONICAL_GRAPH_ENTITY_TYPES.includes("MCPServer"), true);
  assert.equal(CANONICAL_GRAPH_ENTITY_TYPES.includes("TrustFinding"), true);
  assert.equal(CANONICAL_RELATIONSHIP_TYPES.includes("VIOLATES_POLICY"), true);
  assert.equal(CANONICAL_RELATIONSHIP_TYPES.includes("EXPOSES_DATA_TO"), true);
});

test("lineage helper preserves temporal metadata", () => {
  const lineage = buildLineage("run-1", ["parent-a"]);
  assert.equal(lineage.runId, "run-1");
  assert.equal(lineage.parents?.[0], "parent-a");
  assert.equal(typeof lineage.capturedAt, "string");
});
