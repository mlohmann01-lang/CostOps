import test from "node:test";
import assert from "node:assert/strict";
import { sharedMailboxLicenseReclaimPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";

test("shared mailbox conversion candidate enforces privileged blocking", () => {
  const blocked = sharedMailboxLicenseReclaimPlaybook.evaluate({ email:"exec@c.com", displayName:"Exec", sku:"E3", cost:30, days:200, mailboxType:"user", isExecutive:true, assignedLicenses:["E3"] });
  assert.equal(blocked.matched, false);
  const ok = sharedMailboxLicenseReclaimPlaybook.evaluate({ email:"ops@c.com", displayName:"Ops", sku:"E3", cost:30, days:200, mailboxType:"user", delegatedUsersCount:4, assignedLicenses:["E3"] });
  assert.equal(ok.matched, true);
  assert.equal(ok.recommendedAction, "CONVERT_TO_SHARED_MAILBOX");
});
