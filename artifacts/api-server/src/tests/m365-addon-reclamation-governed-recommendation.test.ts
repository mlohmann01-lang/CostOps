import test from 'node:test';
import assert from 'node:assert/strict';
import { buildM365AddonReclamationGovernedRecommendation } from '../lib/playbooks/m365-addon-reclamation/governed-recommendation';

const base = {
  tenantId: 't1', userId: 'u1', userPrincipalName: 'u1@contoso.com', addonSku: 'POWER_BI_PRO', baseSku: 'M365_E3', assignmentState: 'ASSIGNED' as const, usageLevel: 'LOW' as const, usageSignals: ['monthly_active_days:1'], personaFit: 'WEAK' as const, department: 'Finance', costCentre: 'CC200', lastActivityDate: '2026-05-01', sourceReferences: ['graph','billing'], projectedMonthlySavingsOrValue: 18, lifecycleState: 'TRUSTED' as const,
};

test('unused add-on creates approval-required reclaim recommendation', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, usageLevel: 'NONE' });
  assert.equal(out.recommendation?.actionType, 'RECLAIM_ADDON_LICENSE');
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
});

test('inactive/disabled user with add-on creates approval-required reclaim recommendation', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, accountEnabled: false });
  assert.equal(out.recommendation?.actionType, 'RECLAIM_ADDON_LICENSE');
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
});

test('overlap add-on creates approval-required reclaim/review recommendation', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, duplicateEntitlement: true, overlapEvidence: 'duplicate-service-plan' });
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
  assert.ok(['REALLOCATE_ADDON_LICENSE','RECLAIM_ADDON_LICENSE'].includes(String(out.recommendation?.actionType)));
});

test('review-only action is MANUAL_ONLY / not executable', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, usageLevel: 'MEDIUM', personaFit: 'MEDIUM', duplicateEntitlement: false, overlapEvidence: undefined, baseSkuEligible: true });
  assert.equal(out.recommendation?.actionType, 'REVIEW_ADDON_ALLOCATION');
  assert.equal(out.recommendation?.executionReadiness, 'MANUAL_ONLY');
});

test('VIP/compliance/legal-hold/pilot users excluded', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, isVip: true, complianceSensitive: true, legalHold: true, pilotGroupParticipant: true });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('VIP/executive'));
});

test('missing usage blocks readiness', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, usageSignals: [] });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('missing usage data'));
});

test('missing add-on SKU blocks readiness', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, addonSku: undefined });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('add-on SKU required'));
});

test('projected savings visible when approval required', () => {
  const out = buildM365AddonReclamationGovernedRecommendation({ ...base, usageLevel: 'NONE', projectedMonthlySavingsOrValue: 25 });
  assert.equal(out.recommendation?.projectedMonthlySavings, 25);
  assert.equal(out.recommendation?.projectedAnnualSavings, 300);
});

test('evidence contains add-on SKU/base SKU/usage', () => {
  const out = buildM365AddonReclamationGovernedRecommendation(base);
  const refs = out.recommendation?.evidencePointers ?? [];
  assert.ok(refs.some((x) => x.includes('addon-sku:POWER_BI_PRO')));
  assert.ok(refs.some((x) => x.includes('base-sku:M365_E3')));
  assert.ok(refs.some((x) => x.includes('usage:monthly_active_days:1')));
});

test('no automatic execution request', () => {
  const out = buildM365AddonReclamationGovernedRecommendation(base);
  assert.equal((out.recommendation as any)?.executionRequestId, undefined);
});
