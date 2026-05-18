import test from "node:test";
import assert from "node:assert/strict";
import { contractorLeaverReviewPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("contractor leaver review triggers on stale contractor with licenses", () => {
  const out = contractorLeaverReviewPlaybook.evaluate({ email:"contractor@c.com", displayName:"Contractor", sku:"E3", cost:30, days:120, isContractor:true, assignedLicenses:["E3"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "REVIEW_CONTRACTOR_LICENSE");
});
