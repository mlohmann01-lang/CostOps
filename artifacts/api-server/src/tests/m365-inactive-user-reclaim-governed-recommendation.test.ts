import test from "node:test";
import assert from "node:assert/strict";
import { buildM365InactiveUserReclaimGovernedRecommendation, type M365ReclaimSignal } from "../lib/playbooks/m365-inactive-user-reclaim/governed-recommendation";

const base = (): M365ReclaimSignal => ({
  tenantId: "t1",
  playbookId: "M365_DISABLED_LICENSED_USER_RECLAIM",
  userId: "u1",
  userPrincipalName: "user@contoso.com",
  accountEnabled: false,
  inactivityDays: 120,
  assignedLicenses: ["E5"],
  projectedMonthlySavings: 55,
  graphNodeIds: ["node-u1"],
  graphEdgeIds: ["edge-u1-sku"],
  discoveryLifecycleState: "TRUSTED",
  confidenceScore: 0.95,
  reliabilityBand: "HIGH",
  hasTrustedIdentityMatch: true,
  hasUsageData: true,
});

test("disabled licensed trusted user creates APPROVAL_REQUIRED recommendation", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation(base());
  assert.ok(out.recommendation);
  assert.equal(out.recommendation?.executionReadiness, "APPROVAL_REQUIRED");
});

test("inactive >90 days trusted user creates APPROVAL_REQUIRED recommendation", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation({ ...base(), playbookId: "M365_INACTIVE_LICENSED_USER_RECLAIM", accountEnabled: true, inactivityDays: 91 });
  assert.ok(out.recommendation);
  assert.equal(out.recommendation?.executionReadiness, "APPROVAL_REQUIRED");
});

test("admin/service/shared/no-reply users excluded", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation({ ...base(), isAdmin: true, isServiceAccount: true, isSharedMailbox: true, userPrincipalName: "no-reply@contoso.com" });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes("admin account"));
  assert.ok(out.excludedReasons.includes("service account"));
  assert.ok(out.excludedReasons.includes("shared mailbox"));
  assert.ok(out.excludedReasons.includes("no-reply account"));
});

test("missing evidence blocks recommendation execution", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation({ ...base(), assignedLicenses: [] });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes("missing assigned licence"));
});

test("untrusted lifecycle blocks execution", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation({ ...base(), discoveryLifecycleState: "MATCHED" });
  assert.ok(out.recommendation);
  assert.equal(out.recommendation?.executionReadiness, "BLOCKED");
});

test("projected savings still visible when approval required", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation(base());
  assert.equal(out.recommendation?.projectedMonthlySavings, 55);
  assert.equal(out.recommendation?.projectedAnnualSavings, 660);
});

test("recommendation contains graph references and evidence pointers", () => {
  const out = buildM365InactiveUserReclaimGovernedRecommendation(base());
  assert.deepEqual(out.recommendation?.graphNodeIds, ["node-u1"]);
  assert.deepEqual(out.recommendation?.graphEdgeIds, ["edge-u1-sku"]);
  assert.deepEqual(out.recommendation?.evidencePointers, ["m365:sku:E5"]);
});
