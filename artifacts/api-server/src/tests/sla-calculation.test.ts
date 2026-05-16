import test from "node:test";
import assert from "node:assert/strict";
import { deriveSlaStatus } from "../lib/observability/operational-telemetry-service";

test("scores below threshold are breached", () => {
  assert.equal(deriveSlaStatus(0.72), "BREACHED");
});
