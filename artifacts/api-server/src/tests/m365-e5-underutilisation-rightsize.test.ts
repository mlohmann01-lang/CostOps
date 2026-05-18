import test from "node:test";
import assert from "node:assert/strict";
import { e5UnderusedRightsizePlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("e5 underutilisation rightsize requires low premium usage", () => {
  const out = e5UnderusedRightsizePlaybook.evaluate({ email:"a@c.com", displayName:"A", sku:"E5", cost:57, days:15, advancedFeatureUsage:0.1, activityPresent:true, assignedLicenses:["E5"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "RIGHTSIZE_E5_TO_E3");
});
