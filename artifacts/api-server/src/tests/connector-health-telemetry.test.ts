import test from "node:test";
import assert from "node:assert/strict";
import { deriveSlaStatus } from "../lib/observability/operational-telemetry-service";

test("connector freshness score maps to healthy status", () => {
  assert.equal(deriveSlaStatus(0.97), "HEALTHY");
});
