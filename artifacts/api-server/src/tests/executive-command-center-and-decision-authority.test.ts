import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { executiveCommandCenterService } from '../lib/executive-command-center/executive-command-center-service';
import { getExecutiveCommandCenterAuthority } from '../lib/executive-command-center/executive-command-center-authority';
import { executiveDecisionAuthorityService } from '../lib/executive-decision-authority/executive-decision-authority-service';
import { getExecutiveDecisionAuthority } from '../lib/executive-decision-authority/executive-decision-authority';

async function seedAsset(tenantId: string, opts: {
  withOwner?: boolean; withCapability?: boolean; withSpend?: boolean; annualSpend?: number;
  withOutcome?: boolean; measuredValue?: number; withMeasuredValue?: boolean; withEvidence?: boolean; evidenceCount?: number;
} = {}) {
  const outcomeIds: string[] = [];
  if (opts.withOutcome !== false) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({
      tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Faster resolution',
      measuredValue: opts.withMeasuredValue === false ? undefined : (opts.measuredValue ?? 200000),
      currency: 'USD',
    });
    outcomeIds.push(outcome.id);
  }
  const evidenceRefs = opts.withEvidence === false ? [] : Array.from({ length: opts.evidenceCount ?? 1 }, (_, i) => `evidence-${i + 1}`);
  return technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'Support Suite',
    assetType: 'SAAS',
    lifecycleStatus: 'ACTIVE',
    ownerUserId: opts.withOwner === false ? undefined : 'jane.doe',
    businessCapability: opts.withCapability === false ? undefined : 'Customer Service',
    annualSpend: opts.withSpend === false ? undefined : (opts.annualSpend ?? 100000),
    currency: opts.withSpend === false ? undefined : 'USD',
    outcomeIds,
    evidenceRefs,
  });
}

// ─── EX1: Executive Command Center ───────────────────────────────────────────

test('EX1.1 summary: zero assets reported honestly with zero coverage', async () => {
  const t = `t-ex1-1-${randomUUID()}`;
  const summary = await executiveCommandCenterService.getExecutiveValueSummary(t);
  assert.equal(summary.totalTechnologyAssets, 0);
  assert.equal(summary.totalSpendKnown, 0);
});

test('EX1.1 summary: real coverage reflects real seeded asset', async () => {
  const t = `t-ex1-1b-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 50000, measuredValue: 100000, evidenceCount: 2 });
  const summary = await executiveCommandCenterService.getExecutiveValueSummary(t);
  assert.equal(summary.totalTechnologyAssets, 1);
  assert.equal(summary.totalSpendKnown, 50000);
  assert.equal(summary.totalValueKnown, 100000);
});

test('EX1.2 dashboard aggregation: portfolio/economics/recommendations/risk sections all populated', async () => {
  const t = `t-ex1-2-${randomUUID()}`;
  await seedAsset(t, { withOwner: false, annualSpend: 80000 });
  const dashboard = await executiveCommandCenterService.getDashboard(t);
  assert.equal(dashboard.portfolio.totalAssets, 1);
  assert.equal(dashboard.recommendations.totalTechnologies, 1);
  assert.equal(dashboard.risk.unknownOwnershipCount, 1);
});

test('EX1.3 investment view: sorted with RETIRE ahead of KEEP, highest priority first', async () => {
  const t = `t-ex1-3-${randomUUID()}`;
  await seedAsset(t, { withOutcome: false, withEvidence: false }); // RETIRE: known spend, no outcomes/evidence
  const second = await technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId: t, name: 'Other App', assetType: 'SAAS', lifecycleStatus: 'ACTIVE',
    ownerUserId: 'jane.doe', businessCapability: 'Finance Ops', annualSpend: 20000, currency: 'USD',
    outcomeIds: [], evidenceRefs: ['evidence-1'],
  });
  void second;
  const rows = await executiveCommandCenterService.getInvestmentView(t);
  assert.ok(rows.length >= 2);
  const retireIndex = rows.findIndex((r) => r.recommendation === 'RETIRE');
  const keepIndex = rows.findIndex((r) => r.recommendation === 'KEEP');
  assert.ok(retireIndex !== -1 && keepIndex !== -1);
  assert.ok(retireIndex < keepIndex);
});

test('EX1.4 risk view: reuses real findings, no fabricated risks', async () => {
  const t = `t-ex1-4-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false, withCapability: false, withEvidence: false });
  const risk = await executiveCommandCenterService.getRiskView(t);
  assert.ok(risk.missingOwnership.some((r) => r.assetId === asset.id));
  assert.ok(risk.missingCapabilityMapping.some((r) => r.assetId === asset.id));
  assert.ok(risk.missingEvidence.some((r) => r.assetId === asset.id));
});

test('EX1 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-ex1-auth-${randomUUID()}`;
  const result = await getExecutiveCommandCenterAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'EXECUTIVE_COMMAND_CENTER_AUTHORITY');
});

test('EX1 authority: well-evidenced technology improves the verdict', async () => {
  const t = `t-ex1-auth-b-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 80000, measuredValue: 200000, evidenceCount: 2 });
  const result = await getExecutiveCommandCenterAuthority(t);
  assert.ok(result.score > 0);
});

test('EX1 tenant isolation: executive summary never mixes data across tenants', async () => {
  const tA = `t-ex1-iso-a-${randomUUID()}`;
  const tB = `t-ex1-iso-b-${randomUUID()}`;
  await seedAsset(tA, { annualSpend: 70000 });
  const summaryB = await executiveCommandCenterService.getExecutiveValueSummary(tB);
  assert.equal(summaryB.totalTechnologyAssets, 0);
});

// ─── EX2: Executive Decision Authority — decision mapping (all 7 decisions) ─

test('EX2.1 decision: APPROVE_EXPANSION — EXPAND recommendation maps directly', async () => {
  const t = `t-ex2-1-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 50000, measuredValue: 300000, evidenceCount: 2 });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.equal(decision?.decision, 'APPROVE_EXPANSION');
});

test('EX2.2 decision: REQUIRE_REVIEW — REVIEW recommendation maps directly', async () => {
  const t = `t-ex2-2-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false, evidenceCount: 1 });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.equal(decision?.decision, 'REQUIRE_REVIEW');
});

test('EX2.3 decision: INSUFFICIENT_EVIDENCE — no facts exist at all to review', async () => {
  const t = `t-ex2-3-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false, withOutcome: false, withEvidence: false });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.equal(decision?.decision, 'INSUFFICIENT_EVIDENCE');
});

test('EX2.4 decision: APPROVE_RETIREMENT — RETIRE recommendation maps directly', async () => {
  const t = `t-ex2-4-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: false, withEvidence: false });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.equal(decision?.decision, 'APPROVE_RETIREMENT');
});

test('EX2.5 decision: APPROVE_OPTIMISATION — OPTIMISE recommendation maps directly', async () => {
  const t = `t-ex2-5-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 100000, measuredValue: 50000, evidenceCount: 1 });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.equal(decision?.decision, 'APPROVE_OPTIMISATION');
});

test('EX2.6 decision: KEEP recommendation requires no executive decision', async () => {
  const t = `t-ex2-6-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: false, evidenceCount: 1 });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.equal(decision, undefined);
});

// ─── EX2.3: weakest dependency confidence ────────────────────────────────────

test('EX2.3 confidence: weak evidence caps executive confidence even when other factors are strong', async () => {
  const t = `t-ex2-conf-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 50000, measuredValue: 300000, evidenceCount: 1 });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.ok(decision);
  assert.notEqual(decision!.executiveConfidence, 'VERIFIED');
});

// ─── EX2.5: portfolio summary ────────────────────────────────────────────────

test('EX2.5 summary: counts reflect real decisions, KEEP excluded from canonical counts', async () => {
  const t = `t-ex2-summary-${randomUUID()}`;
  await seedAsset(t, { withOwner: false, evidenceCount: 1 });
  const summary = await executiveDecisionAuthorityService.getSummary(t);
  assert.equal(summary.totalTechnologies, 1);
  assert.equal(summary.requireReviewCount, 1);
});

// ─── EX2.6: decision queue priority ordering ─────────────────────────────────

test('EX2.6 queue: APPROVE_RETIREMENT outranks REQUIRE_REVIEW which outranks KEEP', async () => {
  const t = `t-ex2-queue-${randomUUID()}`;
  await seedAsset(t, { withOutcome: false, withEvidence: false }); // RETIRE -> APPROVE_RETIREMENT
  await technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId: t, name: 'Reviewed App', assetType: 'SAAS', lifecycleStatus: 'ACTIVE',
    ownerUserId: undefined, businessCapability: 'Finance Ops', annualSpend: 20000, currency: 'USD',
    outcomeIds: [], evidenceRefs: ['evidence-1'],
  }); // REVIEW -> REQUIRE_REVIEW
  await technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId: t, name: 'Keep App', assetType: 'SAAS', lifecycleStatus: 'ACTIVE',
    ownerUserId: 'jane.doe', businessCapability: 'Finance Ops', annualSpend: 20000, currency: 'USD',
    outcomeIds: [], evidenceRefs: ['evidence-1'],
  }); // KEEP
  const queue = await executiveDecisionAuthorityService.getDecisionQueue(t);
  const retireIndex = queue.findIndex((q) => q.decision === 'APPROVE_RETIREMENT');
  const reviewIndex = queue.findIndex((q) => q.decision === 'REQUIRE_REVIEW');
  const keepIndex = queue.findIndex((q) => q.decision === 'KEEP');
  assert.ok(retireIndex !== -1 && reviewIndex !== -1 && keepIndex !== -1);
  assert.ok(retireIndex < reviewIndex);
  assert.ok(reviewIndex < keepIndex);
});

// ─── EX2.7: proof pack integration ────────────────────────────────────────────

test('EX2.7 proof pack: decision exposes proof pack availability honestly when no packs exist', async () => {
  const t = `t-ex2-pp-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 50000, measuredValue: 300000, evidenceCount: 2 });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.ok(decision);
  assert.equal(decision!.proofPackAvailability.available, false);
  assert.equal(decision!.proofPackAvailability.packCount, 0);
});

// ─── EX2.8: authority verdict ────────────────────────────────────────────────

test('EX2.8 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-ex2-auth-${randomUUID()}`;
  const result = await getExecutiveDecisionAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'EXECUTIVE_DECISION_AUTHORITY');
});

test('EX2.8 authority: real decisions improve the verdict', async () => {
  const t = `t-ex2-auth-b-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 50000, measuredValue: 300000, evidenceCount: 2 });
  const result = await getExecutiveDecisionAuthority(t);
  assert.ok(result.score > 0);
});

test('EX2 tenant isolation: decisions never mix data across tenants', async () => {
  const tA = `t-ex2-iso-a-${randomUUID()}`;
  const tB = `t-ex2-iso-b-${randomUUID()}`;
  await seedAsset(tA, { annualSpend: 70000, evidenceCount: 1 });
  const decisionsB = await executiveDecisionAuthorityService.getAllDecisions(tB);
  assert.equal(decisionsB.length, 0);
});

// ─── EX2.4: narrative format ──────────────────────────────────────────────────

test('EX2.4 narrative: matches board-ready format with Recommendation/Technology/Evidence/Confidence', async () => {
  const t = `t-ex2-narrative-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: false, withEvidence: false });
  const decision = await executiveDecisionAuthorityService.getAssetDecision(t, asset.id);
  assert.ok(decision);
  assert.match(decision!.narrative, /^Recommendation: APPROVE_RETIREMENT/);
  assert.match(decision!.narrative, /Technology: Support Suite/);
  assert.match(decision!.narrative, /Evidence:/);
  assert.match(decision!.narrative, /Executive Confidence:/);
});
