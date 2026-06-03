import test from "node:test";
import assert from "node:assert/strict";
import { scoreRenewalContractTrust } from "../lib/playbooks/renewals/renewal-contract-trust";

test("renewal contract trust scores complete and incomplete evidence", () => {
  const high = scoreRenewalContractTrust({ ownerKnown: true, renewalDateKnown: true, annualCostKnown: true, assignedUsersKnown: true, activeUsersKnown: true, utilisationKnown: true, duplicateDataKnown: true, evidenceRefsAvailable: true });
  const low = scoreRenewalContractTrust({ ownerKnown: false, renewalDateKnown: false, annualCostKnown: false, assignedUsersKnown: false, activeUsersKnown: false, utilisationKnown: false, duplicateDataKnown: false, evidenceRefsAvailable: false });
  assert.equal(high.trustBand, "HIGH");
  assert.ok(high.trustScore > low.trustScore);
  assert.ok(low.trustBand === "LOW" || low.trustBand === "BLOCKED");
});
