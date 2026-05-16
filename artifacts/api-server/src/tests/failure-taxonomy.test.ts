import test from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "../lib/observability/operational-telemetry-service";

test("classifies connector sync failures", () => {
  assert.equal(classifyFailure("CONNECTOR_SYNC_FAILED"), "CONNECTOR_FAILURE");
});
