import test from "node:test";
import assert from "node:assert/strict";
import { addonLicenseReclaimPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("addon reclaim detects stale add-on usage", () => {
  const out = addonLicenseReclaimPlaybook.evaluate({ email:"a@c.com", displayName:"A", sku:"ADDON_VISIO", cost:18, days:100, addonUsageDaysAgo:180, assignedLicenses:["ADDON_VISIO"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "RECLAIM_UNUSED_ADDON");
});
