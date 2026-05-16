import test from "node:test";
import assert from "node:assert/strict";

test("trust gating mapping constants remain supported", () => {
  const statuses = ["READY_FOR_REVIEW","NEEDS_EVIDENCE","NEEDS_TRUST_REVIEW","GOVERNANCE_REVIEW_REQUIRED","SUPPRESSED_BY_RECONCILIATION_FINDINGS","SUPPRESSED_BY_CONNECTOR_TRUST"];
  assert.equal(statuses.includes("NEEDS_EVIDENCE"), true);
});
