import test from "node:test";
import assert from "node:assert/strict";
import { e3WithoutDesktopAppsRightsizePlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("e3 desktop rightsize identifies no-desktop-usage patterns", () => {
  const out = e3WithoutDesktopAppsRightsizePlaybook.evaluate({ email:"a@c.com", displayName:"A", sku:"E3", cost:36, days:40, hasDesktopActivity:false, assignedLicenses:["E3"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "RIGHTSIZE_E3_TO_LIGHTER_TIER");
});
