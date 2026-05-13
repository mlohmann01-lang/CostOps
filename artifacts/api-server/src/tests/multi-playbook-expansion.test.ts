import test from "node:test";
import assert from "node:assert/strict";

import {
  disabledLicensedUserReclaimPlaybook,
  e5ToE3RightsizingPlaybook,
  sharedMailboxConversionPlaybook,
  unusedAddonReclaimPlaybook,
  webOnlyF3CandidatePlaybook,
} from "../lib/playbooks/m365-multi-playbooks.js";
import { assessTrust } from "../lib/trust-engine.js";
import { resolveProjectedSavings } from "../lib/pricing/pricing-engine.js";
import { PLAYBOOK_REGISTRY } from "../lib/playbooks/registry.js";

test("all new playbooks are operational in registry", () => {
  const ids = PLAYBOOK_REGISTRY.map((p) => p.id);
  assert.ok(ids.includes("m365_disabled_licensed_user_reclaim_v1"));
  assert.ok(ids.includes("m365_shared_mailbox_conversion_v1"));
  assert.ok(ids.includes("m365_e5_to_e3_rightsizing_v1"));
  assert.ok(ids.includes("m365_web_only_f3_candidate_v1"));
  assert.ok(ids.includes("m365_unused_addon_reclaim_v1"));
});

test("disabled users produce reclaim recommendation", () => {
  const out = disabledLicensedUserReclaimPlaybook.evaluate({ email: "disabled@contoso.com", displayName: "Disabled", sku: "E5", cost: 57, days: 10, accountEnabled: false, assignedLicenses: ["E5"], userPrincipalName: "disabled@contoso.com" });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "REMOVE_LICENSE");
});

test("E5 users with low feature usage produce downgrade recommendation", () => {
  const out = e5ToE3RightsizingPlaybook.evaluate({ email: "e5@contoso.com", displayName: "E5", sku: "E5", cost: 57, days: 2, assignedLicenses: ["E5"], userPrincipalName: "e5@contoso.com", advancedFeatureUsage: 0.1, activityPresent: true });
  assert.equal(out.matched, true);
  assert.equal(out.recommendedAction, "DOWNGRADE_LICENSE");
});

test("shared mailbox and addon playbooks evaluate correctly", () => {
  const shared = sharedMailboxConversionPlaybook.evaluate({ email: "shared.box@contoso.com", displayName: "shared", sku: "E3", cost: 36, days: 100, accountEnabled: true, assignedLicenses: ["E3"], userPrincipalName: "shared.box@contoso.com", mailboxType: "shared" });
  assert.equal(shared.matched, true);
  const addon = unusedAddonReclaimPlaybook.evaluate({ email: "addon@contoso.com", displayName: "addon", sku: "ADDON_AUDIO", cost: 12, days: 10, accountEnabled: true, assignedLicenses: ["ADDON_AUDIO"], userPrincipalName: "addon@contoso.com", addonUsageDaysAgo: 240 });
  assert.equal(addon.matched, true);
  const webOnly = webOnlyF3CandidatePlaybook.evaluate({ email: "frontline@contoso.com", displayName: "frontline", sku: "E3", cost: 36, days: 3, accountEnabled: true, assignedLicenses: ["E3"], userPrincipalName: "frontline@contoso.com", hasDesktopActivity: false, advancedFeatureUsage: 0.1, isFrontlineWorker: true });
  assert.equal(webOnly.matched, true);
});

test("reconciliation BLOCK findings prevent recommendation approval eligibility", () => {
  const trust = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 1, ownership_confidence: 1, source_reliability: 1 },
    recommendation_input: { usage_signal_quality: 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: 1 },
    execution_input: { action_reversibility: 1, approval_state: 1, blast_radius_score: 1, rollback_confidence: 1 },
    blocker_context: {},
    reconciliationTrustSignals: { recommendationImpact: "BLOCK", warnings: [], criticalBlockers: ["RECONCILIATION_POLICY_BLOCK"], identitySignals: [], entitlementSignals: [], ownershipSignals: [], conflictSignals: [] },
    mvp_mode: true,
  });
  assert.equal(trust.execution_gate, "BLOCKED");
});

test("pricing resolved by pricing-engine and no playbook direct execution", async () => {
  const pricing = await resolveProjectedSavings("default", "E5", 1);
  assert.ok(pricing);
  assert.equal(typeof (disabledLicensedUserReclaimPlaybook as any).execute, "undefined");
});
