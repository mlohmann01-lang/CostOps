import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("m365 runtime telemetry events wired in core services", () => {
  const pb = fs.readFileSync(new URL("../lib/playbooks/playbook-recommendation-service.ts", import.meta.url), "utf8");
  const out = fs.readFileSync(new URL("../lib/recommendations/recommendation-outcome-resolution-service.ts", import.meta.url), "utf8");
  assert.equal(pb.includes("M365_RECOMMENDATION_GENERATED"), true);
  assert.equal(pb.includes("M365_RECOMMENDATION_SUPPRESSED"), true);
  assert.equal(pb.includes("M365_LIFECYCLE_STATE_DERIVED"), true);
  assert.equal(out.includes("M365_OUTCOME_RESOLVED"), true);
  assert.equal(out.includes("M365_OUTCOME_DRIFT_DETECTED"), true);
});
