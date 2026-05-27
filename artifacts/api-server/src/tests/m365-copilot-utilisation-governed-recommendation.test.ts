import test from 'node:test';
import assert from 'node:assert/strict';
import { buildM365CopilotUtilisationGovernedRecommendation } from '../lib/playbooks/m365-copilot-utilisation/governed-recommendation';

const base = {
  tenantId: 't1', userId: 'u1', userPrincipalName: 'u1@contoso.com', assignedCopilotSku: 'COPILOT_M365', copilotUsageLevel: 'LOW' as const, copilotUsageSignals: ['prompt_count:1'], m365AppUsageBaseline: 'web-only', department: 'Sales', costCentre: 'CC100', personaFit: 'WEAK' as const, lastActivityDate: '2026-05-01', sourceReferences: ['graph', 'usage'], projectedMonthlySavingsOrValue: 30, lifecycleState: 'TRUSTED' as const,
};

test('unused Copilot licence creates approval-required reclaim recommendation', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, copilotUsageLevel: 'NONE' });
  assert.equal(out.recommendation?.actionType, 'RECLAIM_COPILOT_LICENSE');
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
});

test('low-usage Copilot creates approval-required review/reclaim/reallocate recommendation', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, highDemandDepartmentNeedsAllocation: true });
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
  assert.ok(['RECLAIM_COPILOT_LICENSE','REALLOCATE_COPILOT_LICENSE'].includes(String(out.recommendation?.actionType)));
});

test('inactive/disabled Copilot user creates approval-required reclaim recommendation', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, accountEnabled: false });
  assert.equal(out.recommendation?.actionType, 'RECLAIM_COPILOT_LICENSE');
  assert.equal(out.recommendation?.executionReadiness, 'APPROVAL_REQUIRED');
});

test('review-only action is MANUAL_ONLY / not executable', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, copilotUsageLevel: 'MEDIUM', personaFit: 'MEDIUM', highDemandDepartmentNeedsAllocation: false });
  assert.equal(out.recommendation?.actionType, 'REVIEW_COPILOT_ALLOCATION');
  assert.equal(out.recommendation?.executionReadiness, 'MANUAL_ONLY');
});

test('VIP/compliance/pilot users excluded', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, isVip: true, complianceSensitive: true, pilotGroupParticipant: true });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('executive/VIP'));
});

test('missing usage blocks readiness', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, copilotUsageSignals: [] });
  assert.equal(out.recommendation, null);
  assert.ok(out.excludedReasons.includes('missing usage data'));
});

test('projected savings visible when approval required', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base, copilotUsageLevel: 'NONE', projectedMonthlySavingsOrValue: 42 });
  assert.equal(out.recommendation?.projectedMonthlySavings, 42);
  assert.equal(out.recommendation?.projectedAnnualSavings, 504);
});

test('evidence contains Copilot SKU and usage signals', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation({ ...base });
  const refs = out.recommendation?.evidencePointers ?? [];
  assert.ok(refs.some((x) => x.includes('copilot-sku:COPILOT_M365')));
  assert.ok(refs.some((x) => x.includes('copilot-usage:prompt_count:1')));
});

test('no execution request created automatically', () => {
  const out = buildM365CopilotUtilisationGovernedRecommendation(base);
  assert.equal((out.recommendation as any)?.executionRequestId, undefined);
});
