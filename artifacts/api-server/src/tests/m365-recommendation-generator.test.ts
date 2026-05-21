import test from 'node:test';
import assert from 'node:assert/strict';
import { generateM365Recommendations, type M365SkuPricing } from '../lib/connectors/m365/m365-recommendation-generator';
import type { M365NormalizedUserLicenseEvidence } from '../lib/connectors/m365/m365-readonly-evidence-sync-service';

const pricing: M365SkuPricing[] = [{ skuId: 'E5', monthlyPrice: 57 }, { skuId: 'E3', monthlyPrice: 36 }, { skuId: 'COPILOT', monthlyPrice: 30 }, { skuId: 'VISIO', monthlyPrice: 15 }];

function mk(partial: Partial<M365NormalizedUserLicenseEvidence>): M365NormalizedUserLicenseEvidence {
  return { tenantId: 't1', userId: 'u1', userPrincipalName: 'u1@contoso.com', displayName: 'U1', accountEnabled: true, assignedSkuIds: ['E5'], assignedSkuNames: ['M365_E5'], assignedLicenseCount: 1, lastSignInDateTime: null, lastNonInteractiveSignInDateTime: null, inactivityDays: 90, evidenceFreshness: 'FRESH', evidenceFreshnessReason: 'ok', evidenceConfidence: 0.95, isDisabledLicensedUser: false, isInactiveLicensedUser: true, isAdminProtected: false, isServiceAccountCandidate: false, exclusionReasons: [], sourceEvidenceIds: ['user:u1'], normalizedAt: new Date().toISOString(), ...partial };
}

test('generates inactive rightsizing', () => {
  const out = generateM365Recommendations({ tenantId: 't1', normalizedEvidence: [mk({})], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.some((r) => r.recommendationType === 'LICENSE_RIGHTSIZE_REVIEW'), true);
});

test('generates e5-to-e3 downgrade', () => {
  const out = generateM365Recommendations({ tenantId: 't1', normalizedEvidence: [mk({ inactivityDays: 40 })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.some((r) => r.recommendationType === 'LICENSE_TIER_DOWNGRADE'), true);
});

test('generates addon reclaim', () => {
  const out = generateM365Recommendations({ tenantId: 't1', normalizedEvidence: [mk({ assignedSkuIds: ['E3', 'VISIO'], assignedSkuNames: ['M365_E3', 'VISIO_PLAN_2'], inactivityDays: 50 })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.some((r) => r.recommendationType === 'ADDON_RECLAIM'), true);
});

test('generates copilot governance recommendations', () => {
  const out = generateM365Recommendations({ tenantId: 't1', normalizedEvidence: [mk({ assignedSkuIds: ['COPILOT'], assignedSkuNames: ['MICROSOFT_COPILOT'], inactivityDays: 65 })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.some((r) => ['COPILOT_RECLAIM','COPILOT_REVIEW','COPILOT_REALLOCATE'].includes(r.recommendationType)), true);
});

test('generates overlap elimination', () => {
  const out = generateM365Recommendations({ tenantId: 't1', normalizedEvidence: [mk({ assignedSkuIds: ['E5', 'VISIO'], assignedSkuNames: ['M365_E5', 'TEAMS PHONE'] })], skuPricingCatalog: pricing });
  assert.equal(out.recommendations.some((r) => r.recommendationType === 'LICENSE_OVERLAP_ELIMINATION'), true);
});

test('deterministic IDs and dedupe', () => {
  const one = mk({});
  const out = generateM365Recommendations({ tenantId: 't1', normalizedEvidence: [one, one], skuPricingCatalog: pricing });
  const ids = out.recommendations.map((r) => r.recommendationId);
  assert.equal(new Set(ids).size, ids.length);
});
