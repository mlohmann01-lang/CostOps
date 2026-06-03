import test from "node:test";
import assert from "node:assert/strict";
import { scoreSaaSRationalisationTrust } from "../lib/playbooks/saas-rationalisation/saas-rationalisation-trust";

test("SaaS rationalisation trust scoring uses owner usage cost renewal evidence and approval signals", () => {
  const complete = scoreSaaSRationalisationTrust({ ownerKnown: true, assignedUserCountKnown: true, activeUserCountKnown: true, annualCostKnown: true, renewalDateKnown: true, evidenceRefsAvailable: true, approvedStatusKnown: true });
  assert.equal(complete.trustScore, 100);
  assert.equal(complete.trustBand, "HIGH");
  const partial = scoreSaaSRationalisationTrust({ ownerKnown: false, assignedUserCountKnown: true, activeUserCountKnown: false, annualCostKnown: false, renewalDateKnown: false, evidenceRefsAvailable: false, approvedStatusKnown: true });
  assert.equal(partial.trustScore, 65);
  assert.equal(partial.trustBand, "MEDIUM");
  assert.ok(partial.reasons.includes("Owner missing"));
});
