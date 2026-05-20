import test from "node:test";
import assert from "node:assert/strict";
import { generateM365Recommendations, type M365SkuPricing } from "../lib/connectors/m365/m365-recommendation-generator";
import type { M365NormalizedUserLicenseEvidence } from "../lib/connectors/m365/m365-readonly-evidence-sync-service";

const pricing: M365SkuPricing[] = [{ skuId: "S1", skuName: "M365_E3", monthlyPrice: 36 }];

function mk(partial: Partial<M365NormalizedUserLicenseEvidence>): M365NormalizedUserLicenseEvidence {
  return {
    tenantId: "t1", userId: "u1", userPrincipalName: "u1@contoso.com", displayName: "U1", accountEnabled: false,
    assignedSkuIds: ["S1"], assignedSkuNames: ["M365_E3"], assignedLicenseCount: 1, lastSignInDateTime: null, lastNonInteractiveSignInDateTime: null,
    inactivityDays: 80, evidenceFreshness: "FRESH", evidenceFreshnessReason: "ok", evidenceConfidence: 0.95,
    isDisabledLicensedUser: true, isInactiveLicensedUser: false, isAdminProtected: false, isServiceAccountCandidate: false,
    exclusionReasons: [], sourceEvidenceIds: ["user:u1"], normalizedAt: new Date().toISOString(),
    ...partial,
  };
}

test("generates disabled licensed user reclaim recommendation", () => {
  const out = generateM365Recommendations({ tenantId: "t1", normalizedEvidence: [mk({})], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.length, 1);
  assert.equal(out.recommendations[0].recommendationType, "LICENSE_RECLAIM");
  assert.equal(out.recommendations[0].projectedMonthlySavings, 36);
  assert.equal(out.recommendations[0].proofReferences.length >= 7, true);
});

test("generates inactive licensed user review recommendation", () => {
  const out = generateM365Recommendations({ tenantId: "t1", normalizedEvidence: [mk({ accountEnabled: true, isDisabledLicensedUser: false, isInactiveLicensedUser: true, inactivityDays: 60 })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.length, 1);
  assert.equal(out.recommendations[0].recommendationType, "LICENSE_REVIEW");
});

test("excludes admin-protected and service-account users", () => {
  const out = generateM365Recommendations({ tenantId: "t1", normalizedEvidence: [mk({ isAdminProtected: true, exclusionReasons: ["ADMIN_PROTECTED"] }), mk({ userId: "u2", userPrincipalName: "svc@contoso.com", isServiceAccountCandidate: true, exclusionReasons: ["SERVICE_ACCOUNT_CANDIDATE"] })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.length, 0);
  assert.equal(out.summary.excludedUsers, 2);
});

test("missing pricing emits warning and low savings confidence", () => {
  const out = generateM365Recommendations({ tenantId: "t1", normalizedEvidence: [mk({ assignedSkuIds: ["UNKNOWN"], assignedSkuNames: ["UNK"] })], skuPricingCatalog: [] });
  assert.equal(out.recommendations[0].savingsConfidence, "LOW");
  assert.equal(out.summary.warnings.length > 0, true);
});

test("missing evidence blocks recommendation via insufficient trust", () => {
  const out = generateM365Recommendations({ tenantId: "t1", normalizedEvidence: [mk({ evidenceFreshness: "MISSING", evidenceConfidence: 0.2 })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.length, 0);
});
