import test from 'node:test';
import assert from 'node:assert/strict';
import { buildM365RightsizingGovernedRecommendation } from '../lib/playbooks/m365-rightsizing/governed-recommendation';

const base = {
  tenantId: 't1', userId: 'u1', userPrincipalName: 'u1@contoso.com', currentSku: 'M365_E5', proposedSku: 'M365_E3', usageSignals: ['no-aadp2-usage'], personaFit: 'E3' as const, lastActivityDate: '2026-05-01', confidenceScore: 0.82, sourceReferences: ['graph', 'billing'], projectedMonthlySavings: 22, lifecycleState: 'TRUSTED' as const,
};

test('E5 underuse creates approval-required recommendation', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, currentSku: 'M365_E5', proposedSku: 'M365_E3' });
  assert.equal(out.excludedReasons.length, 0);
  assert.equal(out.recommendation?.actionType, 'RIGHTSIZE_LICENSE');
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
});

test('E3 web-only user creates approval-required recommendation', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, currentSku: 'M365_E3', proposedSku: 'M365_E1', personaFit: 'WEB_ONLY', usageSignals: ['web-only'] });
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
});

test('missing usage blocks readiness', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, usageSignals: [] });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('missing usage data'));
});

test('unknown persona excluded/blocked', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, personaFit: 'UNKNOWN' });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('unknown persona'));
});

test('compliance-sensitive user excluded', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, complianceSensitive: true });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('legal hold / compliance-sensitive user'));
});

test('projected savings visible when approval required', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, projectedMonthlySavings: 15 });
  assert.equal(out.recommendation?.projectedMonthlySavings, 15);
  assert.equal(out.recommendation?.projectedAnnualSavings, 180);
});

test('recommendation contains current/proposed SKU evidence', () => {
  const out = buildM365RightsizingGovernedRecommendation({ ...base, currentSku: 'M365_E5', proposedSku: 'M365_E3' });
  const refs = out.recommendation?.evidencePointers ?? [];
  assert.ok(refs.some((x) => x.includes('current-sku:M365_E5')));
  assert.ok(refs.some((x) => x.includes('proposed-sku:M365_E3')));
});

test('no execution request created automatically', () => {
  const out = buildM365RightsizingGovernedRecommendation(base);
  assert.equal((out.recommendation as any)?.executionRequestId, undefined);
});
