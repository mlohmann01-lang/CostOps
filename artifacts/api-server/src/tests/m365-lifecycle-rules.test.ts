import test from "node:test";
import assert from "node:assert/strict";
import { deriveM365LifecycleState } from "../lib/playbooks/m365-lifecycle-rules";

test("missing evidence maps to NEEDS_EVIDENCE", () => {
  assert.equal(deriveM365LifecycleState({ unknownEvidence: true, trustBand: "HIGH" }), "NEEDS_EVIDENCE");
});
test("low trust maps to NEEDS_TRUST_REVIEW", () => {
  assert.equal(deriveM365LifecycleState({ trustBand: "LOW" }), "NEEDS_TRUST_REVIEW");
});
test("quarantined trust maps to SUPPRESSED", () => {
  assert.equal(deriveM365LifecycleState({ trustBand: "QUARANTINED" }), "SUPPRESSED");
});
test("admin maps to GOVERNANCE_REVIEW_REQUIRED", () => {
  assert.equal(deriveM365LifecycleState({ trustBand: "HIGH", privileged: true }), "GOVERNANCE_REVIEW_REQUIRED");
});
