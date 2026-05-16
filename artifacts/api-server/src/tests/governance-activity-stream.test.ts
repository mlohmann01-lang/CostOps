import test from "node:test";
import assert from "node:assert/strict";
import { classifyFailure } from "../lib/observability/operational-telemetry-service";

test("governance blocked events map to governance block taxonomy", () => {
  assert.equal(classifyFailure("POLICY_EVALUATION_BLOCKED"), "GOVERNANCE_BLOCK");
});
