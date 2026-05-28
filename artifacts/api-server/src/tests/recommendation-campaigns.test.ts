import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCampaigns } from '../lib/campaigns/campaign-builder';

const now = new Date().toISOString();
const old = new Date(Date.now()-120*86400000).toISOString();
const fixtures = [
  { recommendationId:'r1', playbookId:'M365_RIGHTSIZE_LICENSE_V1', projectedMonthlySavings:100, projectedAnnualSavings:1200, opportunityScore:80, executionReadiness:'APPROVAL_REQUIRED', actionRiskClass:'B', evidencePointers:['department:IT','cost-centre:CC1'], blockedReasons:[], requiredApprovals:['owner'], createdAt:now, priorityBand:'HIGH', connectorType:'m365' },
  { recommendationId:'r2', playbookId:'M365_RIGHTSIZE_LICENSE_V1', projectedMonthlySavings:200, projectedAnnualSavings:2400, opportunityScore:75, executionReadiness:'APPROVAL_REQUIRED', actionRiskClass:'D', evidencePointers:['department:IT','cost-centre:CC1'], blockedReasons:['NO_ROLLBACK'], requiredApprovals:['owner','security'], createdAt:old, priorityBand:'MEDIUM', connectorType:'m365' },
  { recommendationId:'r3', playbookId:'M365_COPILOT_UTILISATION_V1', projectedMonthlySavings:50, projectedAnnualSavings:600, opportunityScore:60, executionReadiness:'EXECUTION_READY', actionRiskClass:'A', evidencePointers:['department:HR','cost-centre:CC2'], blockedReasons:[], requiredApprovals:[], createdAt:now, priorityBand:'HIGH', connectorType:'m365' },
];

test('recommendations grouped correctly and totals aggregate correctly',()=>{
  const campaigns = buildCampaigns({ tenantId:'t1', recommendations: fixtures, grouping:'department' });
  assert.equal(campaigns.length,2);
  const it = campaigns.find(c=>c.campaignName.includes('department:IT'))!;
  assert.equal(it.recommendationCount,2);
  assert.equal(it.totalProjectedMonthlySavings,300);
  assert.equal(it.totalProjectedAnnualSavings,3600);
});

test('mixed campaign scoring deterministic + rollback coverage',()=>{
  const a = buildCampaigns({ tenantId:'t1', recommendations: fixtures, grouping:'executionReadiness' });
  const b = buildCampaigns({ tenantId:'t1', recommendations: fixtures, grouping:'executionReadiness' });
  assert.equal(a[0].totalOpportunityScore, b[0].totalOpportunityScore);
  const pending = a.find(c=>c.recommendationIds.includes('r2'))!;
  assert.equal(pending.rollbackCoverage < 100, true);
});

test('stale/high-risk increases governance complexity and no auto-execute fields',()=>{
  const campaigns = buildCampaigns({ tenantId:'t1', recommendations: fixtures, grouping:'riskClass' });
  const d = campaigns.find(c=>c.riskSummary.D===1)!;
  const a = campaigns.find(c=>c.riskSummary.A===1)!;
  assert.equal(d.governanceComplexity > a.governanceComplexity, true);
  assert.equal(('executionRequestId' in d), false);
});

test('tenant isolation enforced by input tenant id',()=>{
  const t1 = buildCampaigns({ tenantId:'tenant-1', recommendations: fixtures, grouping:'connector' });
  const t2 = buildCampaigns({ tenantId:'tenant-2', recommendations: fixtures, grouping:'connector' });
  assert.equal(t1.every(c=>c.tenantId==='tenant-1'), true);
  assert.equal(t2.every(c=>c.tenantId==='tenant-2'), true);
});
