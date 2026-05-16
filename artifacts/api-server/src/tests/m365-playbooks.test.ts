import test from "node:test";
import assert from "node:assert/strict";
import {
  addonLicenseReclaimPlaybook,
  copilotUnderuseReallocationPlaybook,
  disabledLicensedUserReclaimPlaybook,
  e3WithoutDesktopAppsRightsizePlaybook,
  e5UnderusedRightsizePlaybook,
  inactiveUserReclaimPlaybook,
  overlappingSkuCleanupPlaybook,
  sharedMailboxLicenseReclaimPlaybook,
} from "../lib/playbooks/m365-multi-playbooks.js";

const all = [disabledLicensedUserReclaimPlaybook,inactiveUserReclaimPlaybook,e3WithoutDesktopAppsRightsizePlaybook,e5UnderusedRightsizePlaybook,addonLicenseReclaimPlaybook,copilotUnderuseReallocationPlaybook,sharedMailboxLicenseReclaimPlaybook,overlappingSkuCleanupPlaybook];
const base = { email:"user@contoso.com", displayName:"User", sku:"E5", cost:57, days:120, accountEnabled:true, assignedLicenses:["E5"], userPrincipalName:"user@contoso.com" };

test("all 8 m365 playbooks expose required metadata", ()=>{
  assert.equal(all.length, 8);
  for (const p of all){ assert.ok(p.triggerConditions.length>0); assert.ok(p.requiredEvidence.length>0); assert.ok(p.verificationMethod); assert.ok(p.expectedSavingsModel); }
});

test("valid candidate produces recommendation per playbook", ()=>{
  assert.equal(disabledLicensedUserReclaimPlaybook.evaluate({...base, accountEnabled:false}).matched, true);
  assert.equal(inactiveUserReclaimPlaybook.evaluate({...base, days:180, sku:"E3", assignedLicenses:["E3"]}).matched, true);
  assert.equal(e3WithoutDesktopAppsRightsizePlaybook.evaluate({...base, sku:"E3", assignedLicenses:["E3"], hasDesktopActivity:false}).matched, true);
  assert.equal(e5UnderusedRightsizePlaybook.evaluate({...base, advancedFeatureUsage:0.1, activityPresent:true}).matched, true);
  assert.equal(addonLicenseReclaimPlaybook.evaluate({...base, sku:"ADDON_AUDIO", assignedLicenses:["ADDON_AUDIO"], addonUsageDaysAgo:300}).matched, true);
  assert.equal(copilotUnderuseReallocationPlaybook.evaluate({...base, assignedLicenses:["COPILOT"], copilotActivityScore:0.1}).matched, true);
  assert.equal(sharedMailboxLicenseReclaimPlaybook.evaluate({...base, email:"shared.box@contoso.com", userPrincipalName:"shared.box@contoso.com", mailboxType:"shared", assignedLicenses:["E3"]}).matched, true);
  assert.equal(overlappingSkuCleanupPlaybook.evaluate({...base, overlappingSkuDetected:true}).matched, true);
});

test("missing evidence blocks recommendation and exclusions apply", ()=>{
  assert.equal(addonLicenseReclaimPlaybook.evaluate({...base, sku:"ADDON_AUDIO", addonUsageDaysAgo:null}).matched, false);
  const excluded = disabledLicensedUserReclaimPlaybook.evaluate({...base, email:"admin@contoso.com", userPrincipalName:"admin@contoso.com", accountEnabled:false});
  assert.ok(excluded.exclusions.includes("admin account"));
});

test("risk class, execution mode, savings and verification assigned", ()=>{
  const out = overlappingSkuCleanupPlaybook.evaluate({...base, overlappingSkuDetected:true});
  assert.equal(out.riskClass, "C");
  assert.equal(out.executionMode, "MANUAL");
  assert.ok(out.estimatedMonthlySaving >= 0);
  assert.ok(out.verificationMethod);
});
