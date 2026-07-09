import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { recommendationOrchestrationService } from '../lib/recommendation-orchestration/recommendation-orchestration-service';
import { getRecommendationOrchestrationAuthority } from '../lib/recommendation-orchestration/recommendation-orchestration-authority';

async function seedAsset(tenantId: string, opts: {
  withOwner?: boolean; withCapability?: boolean; withOutcome?: boolean;
  withEvidence?: boolean; lifecycleStatus?: any; annualSpend?: number; vendorId?: string;
  executiveOwnerId?: string; criticality?: any;
} = {}) {
  const outcomeIds: string[] = [];
  if (opts.withOutcome) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Faster resolution' });
    outcomeIds.push(outcome.id);
  }
  const asset = await technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'ServiceNow',
    assetType: 'SAAS',
    lifecycleStatus: opts.lifecycleStatus ?? 'RETIRE_CANDIDATE',
    ownerUserId: opts.withOwner === false ? undefined : 'jane.doe',
    businessCapability: opts.withCapability === false ? undefined : 'Customer Service',
    outcomeIds,
    evidenceRefs: opts.withEvidence === false ? [] : ['evidence-1'],
    annualSpend: opts.annualSpend,
    vendorId: opts.vendorId,
    executiveOwnerId: opts.executiveOwnerId,
    criticality: opts.criticality,
  });
  return asset;
}

// ─── Execution Package Tests ──────────────────────────────────────────────────

test('AO1.1 approval detection: ownership, executive sponsorship and vendor each contribute a real approval requirement', async () => {
  const t = `t-ao1-1-${randomUUID()}`;
  const asset = await seedAsset(t, { executiveOwnerId: 'cio', vendorId: `vendor-${randomUUID()}`, criticality: 'CRITICAL' });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.ok(plan);
  assert.ok(plan!.requiredApprovals.includes('Technology Owner Approval'));
  assert.ok(plan!.requiredApprovals.includes('Executive Approval'));
  assert.ok(plan!.requiredApprovals.includes('Procurement Approval'));
  assert.ok(plan!.requiredApprovals.includes('Security Approval'));
});

test('AO1.2 approval detection: no ownership, no executive owner, no vendor produces no approvals', async () => {
  const t = `t-ao1-2-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.ok(plan);
  assert.equal(plan!.requiredApprovals.length, 0);
});

test('AO1.3 readiness: ownership, evidence and an execution path together produce READY', async () => {
  const t = `t-ao1-3-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.ok(plan);
  assert.equal(plan!.readiness, 'READY');
  assert.equal(plan!.blockers.length, 0);
});

test('AO1.4 readiness: missing ownership blocks execution and is reported, never silently dropped', async () => {
  const t = `t-ao1-4-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.ok(plan);
  assert.equal(plan!.readiness, 'NOT_READY');
  assert.ok(plan!.blockers.some((b) => b.includes('ownership')));
});

test('AO1.5 readiness: missing evidence is reported, not assumed present', async () => {
  const t = `t-ao1-5-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: false });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.ok(plan);
  assert.ok(plan!.blockers.some((b) => b.includes('evidence')));
});

test('AO1.6 complexity: estimated complexity is one of LOW/MEDIUM/HIGH and graph-derived', async () => {
  const t = `t-ao1-6-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.ok(plan);
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(plan!.estimatedComplexity));
});

test('AO1.7 execution package: exposes supporting proof pack, evidence, findings and recommendation', async () => {
  const t = `t-ao1-7-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const pkg = await recommendationOrchestrationService.buildExecutionPackage(t, asset.id);
  assert.ok(pkg);
  assert.ok(pkg!.supportingEvidence.length > 0);
  assert.ok(pkg!.supportingFindings.length > 0);
  assert.ok(pkg!.supportingRecommendation.length > 0);
  assert.match(pkg!.narrative, /Recommendation:/);
});

test('AO1.8 KEEP/REVIEW recommendations have no execution path — never forced into a package', async () => {
  const t = `t-ao1-8-${randomUUID()}`;
  const asset = await seedAsset(t, { lifecycleStatus: 'ACTIVE', withOutcome: true, withEvidence: true, annualSpend: 1000 });
  const plan = await recommendationOrchestrationService.buildExecutionPlan(t, asset.id);
  assert.equal(plan, undefined);
});

// ─── Queue Tests ──────────────────────────────────────────────────────────────

test('AO1.9 queue: a fully-evidenced, owned RETIRE candidate lands in readyForExecution', async () => {
  const t = `t-ao1-9-${randomUUID()}`;
  await seedAsset(t, { withEvidence: true });
  const queue = await recommendationOrchestrationService.getQueue(t);
  assert.ok(queue.readyForExecution.length > 0);
});

test('AO1.10 queue: a RETIRE candidate with no owner lands in blocked', async () => {
  const t = `t-ao1-10-${randomUUID()}`;
  await seedAsset(t, { withOwner: false });
  const queue = await recommendationOrchestrationService.getQueue(t);
  assert.ok(queue.blocked.length > 0);
});

test('AO1.11 queue: a RETIRE candidate with no evidence lands in awaitingEvidence', async () => {
  const t = `t-ao1-11-${randomUUID()}`;
  await seedAsset(t, { withEvidence: false });
  const queue = await recommendationOrchestrationService.getQueue(t);
  assert.ok(queue.awaitingEvidence.length > 0);
});

// ─── Authority Tests ──────────────────────────────────────────────────────────

test('AO1.12 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-ao1-12-${randomUUID()}`;
  const result = await getRecommendationOrchestrationAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'RECOMMENDATION_ORCHESTRATION_AUTHORITY');
});

test('AO1.13 authority: a fully-evidenced, ready execution plan improves the verdict', async () => {
  const t = `t-ao1-13-${randomUUID()}`;
  await seedAsset(t, { withEvidence: true });
  const result = await getRecommendationOrchestrationAuthority(t);
  assert.ok(result.score > 0);
});

// ─── Tenant Isolation ─────────────────────────────────────────────────────────

test('AO1.14 tenant isolation: execution plans never mix data across tenants', async () => {
  const tA = `t-ao1-14a-${randomUUID()}`;
  const tB = `t-ao1-14b-${randomUUID()}`;
  await seedAsset(tA);
  const plansB = await recommendationOrchestrationService.getAllExecutionPlans(tB);
  assert.equal(plansB.length, 0);
});
