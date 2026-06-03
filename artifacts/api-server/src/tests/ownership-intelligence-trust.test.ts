import test from "node:test";
import assert from "node:assert/strict";
import { scoreOwnershipTrust } from "../lib/playbooks/ownership/ownership-intelligence-trust";

test("ownership trust scores complete and incomplete ownership evidence", () => {
  const high = scoreOwnershipTrust({ businessOwnerKnown: true, technicalOwnerKnown: true, budgetOwnerKnown: true, renewalOwnerKnown: true, executiveSponsorKnown: true, costCentreKnown: true, ownerRecentlyConfirmed: true, evidenceRefsAvailable: true, sourceContextAvailable: true });
  const low = scoreOwnershipTrust({ businessOwnerKnown: false, technicalOwnerKnown: false, budgetOwnerKnown: false, renewalOwnerKnown: false, executiveSponsorKnown: false, costCentreKnown: false, ownerRecentlyConfirmed: false, evidenceRefsAvailable: false, sourceContextAvailable: false });
  assert.equal(high.trustBand, "HIGH");
  assert.ok(high.trustScore > low.trustScore);
});
