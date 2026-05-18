import test from "node:test";
import assert from "node:assert/strict";
import { inactiveUserReclaimPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("inactive licensed user reclaim uses 90-day inactivity default", () => {
  const out = inactiveUserReclaimPlaybook.evaluate({ email:"a@c.com", displayName:"A", sku:"E3", cost:30, days:91, activityPresent:false, assignedLicenses:["E3"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "RECLAIM_INACTIVE_LICENSE");
});
