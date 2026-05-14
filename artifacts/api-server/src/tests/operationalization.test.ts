import test from "node:test";
import assert from "node:assert/strict";
import { resolveCanonicalAppIdentity } from "../lib/operationalization/alias-resolution";
import { inferAppOwner } from "../lib/operationalization/owner-inference";
import { deriveReadinessBlockers } from "../lib/operationalization/readiness-blockers";
import { scoreAppOnboarding } from "../lib/operationalization/onboarding-confidence";

test("Microsoft 365 aliases collapse correctly", async () => {
  const r = await resolveCanonicalAppIdentity({ tenantId: "t1", displayName: "O365", sourceSystem: "M365", aliases: ["Microsoft 365"], persistMappingEvent: false });
  assert.equal(r.canonicalName, "Microsoft 365");
});

test("ServiceNow/SNOW aliases collapse correctly", async () => {
  const r = await resolveCanonicalAppIdentity({ tenantId: "t1", displayName: "SNOW", sourceSystem: "SERVICENOW", aliases: ["ServiceNow"], persistMappingEvent: false });
  assert.equal(r.canonicalName, "ServiceNow");
});

test("explicit owner beats inferred owner", () => {
  const o = inferAppOwner({ serviceNowOwner: "owner@corp.com", department: "Finance" });
  assert.equal(o.owner, "owner@corp.com");
  assert.equal(o.source, "SERVICENOW_OWNER");
});

test("missing owner creates OWNER_MISSING blocker", () => {
  const b = deriveReadinessBlockers({ owner: null, entitlementCount: 1, annualCost: 5, contractIds: ["c"], userCount: 2, costCenter: "CC" });
  assert.equal(b.blockers.includes("OWNER_MISSING"), true);
});

test("unknown pricing creates PRICING_UNKNOWN blocker", () => {
  const b = deriveReadinessBlockers({ owner: "x", entitlementCount: 1, contractIds: ["c"], userCount: 2, costCenter: "CC" });
  assert.equal(b.blockers.includes("PRICING_UNKNOWN"), true);
});

test("reconciliation conflict creates RECONCILIATION_CONFLICT blocker", () => {
  const b = deriveReadinessBlockers({ owner: "x", entitlementCount: 1, annualCost: 1, contractIds: ["c"], userCount: 2, costCenter: "CC", reconciliationConflict: true });
  assert.equal(b.blockers.includes("RECONCILIATION_CONFLICT"), true);
});

test("readiness blockers reduce onboarding confidence", () => {
  const ok = scoreAppOnboarding({ owner: "x", entitlementCount: 1, annualCost: 1, contractIds: ["c"], userCount: 2, costCenter: "CC" });
  const bad = scoreAppOnboarding({ owner: null, entitlementCount: 0, annualCost: null, contractIds: [], userCount: 0, costCenter: null });
  assert.equal(bad.onboardingConfidence < ok.onboardingConfidence, true);
});
