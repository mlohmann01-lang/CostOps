import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { recommendationOrchestrationService } from '../lib/recommendation-orchestration/recommendation-orchestration-service';
import { GovernedExecutionService } from '../lib/governed-execution/governed-execution-service';
import { outcomeProtectionService } from '../lib/outcome-protection/outcome-protection';
import { closedLoopOptimisationService } from '../lib/closed-loop-optimisation/closed-loop-optimisation-service';
import { getClosedLoopOptimisationAuthority } from '../lib/closed-loop-optimisation/closed-loop-optimisation-authority';
import { createWorkflow } from '../lib/approvals/approval-workflow-engine';
import { saveApprovalWorkflow } from '../lib/approvals/approval-workflow-store';
import type { GovernedExecutionPlan, GovernedExecutionVerification } from '../lib/governed-execution/governed-execution-types';

const governedExecutionService = new GovernedExecutionService();

async function seedAsset(tenantId: string, opts: {
  withOwner?: boolean; withEvidence?: boolean; withOutcome?: boolean; measuredValue?: number;
} = {}) {
  const outcomeIds: string[] = [];
  if (opts.withOutcome) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({
      tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Realised savings', measuredValue: opts.measuredValue, currency: 'USD',
    } as any);
    outcomeIds.push(outcome.id);
  }
  return technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'ServiceNow',
    assetType: 'SAAS',
    lifecycleStatus: 'RETIRE_CANDIDATE',
    ownerUserId: opts.withOwner === false ? undefined : 'jane.doe',
    businessCapability: 'Customer Service',
    outcomeIds,
    evidenceRefs: opts.withEvidence === false ? [] : ['evidence-1'],
  });
}

async function recommendationIdFor(tenantId: string, assetId: string): Promise<string> {
  const pkg = await recommendationOrchestrationService.buildExecutionPackage(tenantId, assetId);
  assert.ok(pkg);
  return pkg!.plan.recommendationId;
}

function seedApprovalWorkflow(tenantId: string, recommendationId: string, state: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED') {
  const workflow = createWorkflow({ tenantId, targetType: 'RECOMMENDATION', targetId: recommendationId, workflowName: 'Test approval', riskClass: 'B' });
  return saveApprovalWorkflow({ ...workflow, approvalState: state });
}

async function seedExecutionPlan(tenantId: string, recommendationId: string, status: GovernedExecutionPlan['status']): Promise<GovernedExecutionPlan> {
  const plan = await governedExecutionService.createPlanFromRecommendation(tenantId, recommendationId);
  const updated: GovernedExecutionPlan = { ...plan, status, updatedAt: new Date().toISOString() };
  await governedExecutionService.repo.upsertPlan(updated);
  return updated;
}

async function seedVerification(tenantId: string, planId: string, status: GovernedExecutionVerification['status']): Promise<GovernedExecutionVerification> {
  const verification: GovernedExecutionVerification = {
    id: `gexec-verification-${randomUUID()}`, tenantId, planId, status, verificationType: 'STATE_CHANGED', evidenceRefs: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await governedExecutionService.repo.upsertVerification(verification);
  return verification;
}

async function seedProtection(tenantId: string, assetId: string, outcomeId: string) {
  return outcomeProtectionService.protectOutcome({ tenantId, outcomeId, assetId, name: 'Protection', valueType: 'SAVINGS' });
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

test('AO2.1 lifecycle: a fresh recommendation with no approval/execution evidence is RECOMMENDED', async () => {
  const t = `t-ao2-1-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.ok(optimisation);
  assert.equal(optimisation!.lifecycleState, 'RECOMMENDED');
});

test('AO2.1 lifecycle: an approved recommendation with no execution plan is APPROVED', async () => {
  const t = `t-ao2-2-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  seedApprovalWorkflow(t, recommendationId, 'APPROVED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.ok(optimisation);
  assert.equal(optimisation!.lifecycleState, 'APPROVED');
});

test('AO2.1 lifecycle: an executing governed plan is EXECUTING', async () => {
  const t = `t-ao2-3-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'EXECUTING');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'EXECUTING');
});

test('AO2.1 lifecycle: a completed governed plan with no verification is EXECUTED', async () => {
  const t = `t-ao2-4-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'EXECUTED');
});

test('AO2.1 lifecycle: a verified execution is VERIFIED', async () => {
  const t = `t-ao2-5-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'VERIFIED');
});

test('AO2.1 lifecycle: a protected outcome is PROTECTED', async () => {
  const t = `t-ao2-6-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  await seedProtection(t, asset.id, asset.outcomeIds[0]);
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'PROTECTED');
});

test('AO2.1 lifecycle: a protected outcome with realised value reaches LEARNING_COMPLETE', async () => {
  const t = `t-ao2-7-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true, measuredValue: 5000 });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  await seedProtection(t, asset.id, asset.outcomeIds[0]);
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'LEARNING_COMPLETE');
});

test('AO2.1 lifecycle: a rejected approval is FAILED', async () => {
  const t = `t-ao2-8-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  seedApprovalWorkflow(t, recommendationId, 'REJECTED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'FAILED');
});

test('AO2.1 lifecycle: a failed governed execution is FAILED', async () => {
  const t = `t-ao2-9-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'FAILED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'FAILED');
});

// ─── Approval Tracking ──────────────────────────────────────────────────────

test('AO2.3 approval: a pending workflow places the optimisation in APPROVAL_PENDING', async () => {
  const t = `t-ao2-10-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  seedApprovalWorkflow(t, recommendationId, 'PENDING_APPROVAL');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'APPROVAL_PENDING');
});

test('AO2.3 approval: never fabricates an approvalId when none was ever submitted', async () => {
  const t = `t-ao2-11-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.approvalId, undefined);
});

test('AO2.3 approval: rejection is reported, never silently dropped', async () => {
  const t = `t-ao2-12-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  seedApprovalWorkflow(t, recommendationId, 'REJECTED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'FAILED');
});

// ─── Verification Tracking ──────────────────────────────────────────────────

test('AO2.5 verification: VERIFIED status is reflected once evidenced', async () => {
  const t = `t-ao2-13-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'VERIFIED');
  assert.ok(optimisation!.verificationId);
});

test('AO2.5 verification: FAILED verification reports FAILED, never claimed as success', async () => {
  const t = `t-ao2-14-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'FAILED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.lifecycleState, 'FAILED');
});

test('AO2.5 verification: with no verification recorded, status is unknown — left undefined, never assumed', async () => {
  const t = `t-ao2-15-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.verificationId, undefined);
  assert.equal(optimisation!.lifecycleState, 'EXECUTED');
});

// ─── Value Realisation ───────────────────────────────────────────────────────

test('AO2.7 value: a measured economic outcome is recognised as realised', async () => {
  const t = `t-ao2-16-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true, measuredValue: 1000 });
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.equal(learning, undefined); // no execution evidence yet — "no lesson evidence = no lesson"
});

test('AO2.7 value: never invents realised value when no measured outcome exists', async () => {
  const t = `t-ao2-17-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok(learning);
  assert.equal(learning!.valueRealised, false);
});

test('AO2.7 value: a target/expected value alone (no measuredValue) is never counted as realised', async () => {
  const t = `t-ao2-18-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: false });
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.ok(optimisation);
});

// ─── Learning Engine ─────────────────────────────────────────────────────────

test('AO2.8 learning: full success chain produces a positive lesson and positive confidence delta', async () => {
  const t = `t-ao2-19-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true, measuredValue: 5000 });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  await seedProtection(t, asset.id, asset.outcomeIds[0]);
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok(learning);
  assert.equal(learning!.confidenceDelta, 10);
  assert.ok(learning!.lessonsLearned.some((l) => l.includes('prioritised')));
});

test('AO2.8 learning: a failed execution produces a negative lesson and negative confidence delta', async () => {
  const t = `t-ao2-20-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'FAILED');
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok(learning);
  assert.equal(learning!.confidenceDelta, -10);
  assert.equal(learning!.executionSucceeded, false);
});

test('AO2.8 learning: execution succeeded but value not realised yields the mixed-outcome lesson', async () => {
  const t = `t-ao2-21-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok(learning);
  assert.equal(learning!.confidenceDelta, -5);
  assert.ok(learning!.lessonsLearned.some((l) => l.includes('Execution success alone does not guarantee value')));
});

test('AO2.8 learning: no execution evidence at all produces no lesson — undefined, never guessed', async () => {
  const t = `t-ao2-22-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.equal(learning, undefined);
});

// ─── Confidence Feedback ─────────────────────────────────────────────────────

test('AO2.12 confidence: increases only on full evidenced success', async () => {
  const t = `t-ao2-23-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true, measuredValue: 2000 });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  await seedProtection(t, asset.id, asset.outcomeIds[0]);
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok((learning?.confidenceDelta ?? 0) > 0);
});

test('AO2.12 confidence: decreases on execution failure', async () => {
  const t = `t-ao2-24-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'FAILED');
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok((learning?.confidenceDelta ?? 0) < 0);
});

test('AO2.12 confidence: stays unchanged when execution succeeded but could not be verified', async () => {
  const t = `t-ao2-25-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok(learning);
  assert.equal(learning!.confidenceDelta, 0);
});

// ─── Authority ────────────────────────────────────────────────────────────

test('AO2.10 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-ao2-26-${randomUUID()}`;
  const result = await getClosedLoopOptimisationAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'CLOSED_LOOP_OPTIMISATION_AUTHORITY');
});

test('AO2.10 authority: a fully evidenced closed loop improves the verdict toward READY', async () => {
  const t = `t-ao2-27-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true, withOutcome: true, measuredValue: 9000 });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  await seedProtection(t, asset.id, asset.outcomeIds[0]);
  seedApprovalWorkflow(t, recommendationId, 'APPROVED');
  const result = await getClosedLoopOptimisationAuthority(t);
  assert.ok(result.score > 0);
  assert.notEqual(result.verdict, 'NOT_READY');
});

test('AO2.10 authority: a recommendation with no progress at all yields a PARTIAL or NOT_READY verdict', async () => {
  const t = `t-ao2-28-${randomUUID()}`;
  await seedAsset(t, { withEvidence: true });
  const result = await getClosedLoopOptimisationAuthority(t);
  assert.notEqual(result.verdict, 'READY');
});

// ─── Portfolio View ──────────────────────────────────────────────────────────

test('AO2.11 portfolio: buckets technologies by their real lifecycle state', async () => {
  const t = `t-ao2-29-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'EXECUTING');
  const portfolio = await closedLoopOptimisationService.getPortfolio(t);
  assert.equal(portfolio.executing.length, 1);
  assert.equal(portfolio.verified.length, 0);
  assert.equal(portfolio.recommendations.length, 1);
});

// ─── Tenant Isolation ────────────────────────────────────────────────────────

test('AO2 tenant isolation: optimisations never mix data across tenants', async () => {
  const tA = `t-ao2-30a-${randomUUID()}`;
  const tB = `t-ao2-30b-${randomUUID()}`;
  await seedAsset(tA, { withEvidence: true });
  const optimisationsB = await closedLoopOptimisationService.getAllOptimisations(tB);
  assert.equal(optimisationsB.length, 0);
});

// ─── No Fabrication ──────────────────────────────────────────────────────────

test('AO2 no fabrication: no execution means no success claim', async () => {
  const t = `t-ao2-31-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.executionId, undefined);
  assert.equal(optimisation!.lifecycleState, 'RECOMMENDED');
});

test('AO2 no fabrication: no verification means unknown, never claimed verified', async () => {
  const t = `t-ao2-32-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  const optimisation = await closedLoopOptimisationService.buildOptimisation(t, asset.id);
  assert.equal(optimisation!.verificationId, undefined);
  assert.notEqual(optimisation!.lifecycleState, 'VERIFIED');
});

test('AO2 no fabrication: no value evidence means value unknown, not zero or invented', async () => {
  const t = `t-ao2-33-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const recommendationId = await recommendationIdFor(t, asset.id);
  const plan = await seedExecutionPlan(t, recommendationId, 'COMPLETED');
  await seedVerification(t, plan.id, 'VERIFIED');
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.ok(learning);
  assert.equal(learning!.valueRealised, false);
});

test('AO2 no fabrication: no execution evidence means no lesson, not an empty-but-present lesson', async () => {
  const t = `t-ao2-34-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: true });
  const learning = await closedLoopOptimisationService.getLearning(t, asset.id);
  assert.equal(learning, undefined);
});
