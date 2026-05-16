import test from "node:test";
import assert from "node:assert/strict";
import { deriveEvidenceFreshness } from "../lib/connectors/m365/m365-evidence-normalization-service";

test("deriveEvidenceFreshness applies deterministic thresholds", () => {
  const now = new Date("2026-05-16T00:00:00Z");
  assert.equal(deriveEvidenceFreshness("2026-05-14T00:00:00Z", now), "FRESH");
  assert.equal(deriveEvidenceFreshness("2026-05-01T00:00:00Z", now), "STALE");
  assert.equal(deriveEvidenceFreshness("2026-03-01T00:00:00Z", now), "EXPIRED");
  assert.equal(deriveEvidenceFreshness(null, now), "UNKNOWN");
});
