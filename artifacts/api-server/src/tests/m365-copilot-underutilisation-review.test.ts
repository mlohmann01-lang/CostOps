import test from "node:test";
import assert from "node:assert/strict";
import { copilotUnderuseReallocationPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("copilot underutilisation excludes newly assigned cohorts", () => {
  const blocked = copilotUnderuseReallocationPlaybook.evaluate({ email:"u@c.com", displayName:"U", sku:"COPILOT", cost:30, days:40, copilotActivityScore:0.05, copilotRecentlyAssigned:true, assignedLicenses:["COPILOT"] });
  assert.equal(blocked.matched, false);
  const out = copilotUnderuseReallocationPlaybook.evaluate({ email:"u2@c.com", displayName:"U2", sku:"COPILOT", cost:30, days:120, copilotActivityScore:0.05, assignedLicenses:["COPILOT"] });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "REVIEW_COPILOT_ASSIGNMENT");
});
