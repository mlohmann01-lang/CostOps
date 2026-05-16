import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../../../../scripts/fixtures/m365-playbook-demo-evidence.json" assert { type: "json" };
import { PLAYBOOK_REGISTRY } from "../lib/playbooks/registry.js";

test("demo evidence includes required scenarios", ()=>{
  const emails = (fixture as any[]).map((r:any)=>r.userPrincipalName);
  assert.ok(emails.includes("disabled.user@contoso.com"));
  assert.ok(emails.includes("admin.service@contoso.com"));
  assert.ok(emails.includes("missing.evidence@contoso.com"));
});

test("playbook metadata includes risk/execution/verification/rollback", ()=>{
  for (const p of PLAYBOOK_REGISTRY) {
    assert.ok(p.riskClass);
    assert.ok(p.defaultExecutionMode);
    assert.ok(p.verificationMethod);
    assert.ok(p.rollbackConsiderations);
  }
});

test("admin/service and missing evidence can be suppressed by evaluator outputs", ()=>{
  const disabled = PLAYBOOK_REGISTRY.find((p)=>p.id.includes("disabled_licensed_user_reclaim"))!;
  const adminOut = disabled.evaluate({ email:"admin.service@contoso.com", displayName:"a", userPrincipalName:"admin.service@contoso.com", assignedLicenses:["E5"], sku:"E5", cost:57, days:10, accountEnabled:false } as any);
  assert.ok(adminOut.exclusions.some((e)=>String(e).includes("admin") || String(e).includes("service")));

  const addon = PLAYBOOK_REGISTRY.find((p)=>p.id.includes("addon_license_reclaim"))!;
  const miss = addon.evaluate({ email:"missing.evidence@contoso.com", displayName:"m", userPrincipalName:"missing.evidence@contoso.com", assignedLicenses:["ADDON_X"], sku:"ADDON_X", cost:12, days:10, addonUsageDaysAgo:null } as any);
  assert.equal(miss.matched, false);
});

test("playbooks do not directly execute", ()=>{
  for (const p of PLAYBOOK_REGISTRY as any[]) assert.equal(typeof p.execute, "undefined");
});
