import test from "node:test";
import assert from "node:assert/strict";
import { FailureTaxonomy } from "../lib/observability/operational-telemetry-service";

test("failure taxonomy contains deterministic categories", () => {
  assert.ok(FailureTaxonomy.includes("CONNECTOR_FAILURE"));
  assert.ok(FailureTaxonomy.includes("GRAPH_INTEGRITY_FAILURE"));
});
