import test from "node:test";
import assert from "node:assert/strict";
import { disabledLicensedUserReclaimPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("disabled licensed user reclaim matches disabled licensed identities", () => {
  const out = disabledLicensedUserReclaimPlaybook.evaluate({ email:"a@c.com", displayName:"A", sku:"E3", cost:30, days:120, accountEnabled:false, assignedLicenses:["E3"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "RECLAIM_UNUSED_LICENSE");
  assert.equal(out.executionMode, "APPROVAL_REQUIRED");
});
