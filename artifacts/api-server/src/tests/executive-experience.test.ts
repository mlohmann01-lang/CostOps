import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { executiveExperienceService } from '../lib/executive-experience/executive-experience-service';
import { getExecutiveExperienceAuthority } from '../lib/executive-experience/executive-experience-authority';
import { getConsolidatedAuthorityViews } from '../lib/executive-experience/executive-experience-consolidation';

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

// ─── CX1.1: navigation mapping ────────────────────────────────────────────

test('CX1.1 navigation: every nav item declares its real data sources', () => {
  const nav = executiveExperienceService.getNavigation();
  assert.ok(nav.length >= 7);
  for (const item of nav) {
    assert.ok(item.id && item.label && item.path);
    assert.ok(Array.isArray(item.consumes) && item.consumes.length > 0);
  }
});

// ─── CX1.2: dashboard aggregation ──────────────────────────────────────────

test('CX1.2 dashboard: zero data reported honestly', async () => {
  const t = `t-cx1-dash-${randomUUID()}`;
  const dashboard = await executiveExperienceService.getDashboard(t);
  assert.equal(dashboard.value.totalAssets, 0);
  assert.equal(dashboard.investment.totalTechnologies, 0);
  assert.equal(dashboard.decisions.totalTechnologies, 0);
});

test('CX1.2 dashboard: real seeded asset reflected across all sections', async () => {
  const t = `t-cx1-dash-b-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 80000, measuredValue: 200000, evidenceCount: 2 });
  const dashboard = await executiveExperienceService.getDashboard(t);
  assert.equal(dashboard.value.totalAssets, 1);
  assert.equal(dashboard.investment.totalTechnologies, 1);
  assert.ok(dashboard.risk);
  assert.ok(dashboard.actions);
});

// ─── CX1.4: decision aggregation ───────────────────────────────────────────

test('CX1.4 decisions: RETIRE recommendation lands in the Retire bucket with joined spend', async () => {
  const t = `t-cx1-dec-${randomUUID()}`;
  await seedAsset(t, { withOutcome: false, withEvidence: false, annualSpend: 30000 });
  const buckets = await executiveExperienceService.getDecisions(t);
  assert.equal(buckets.Retire.length, 1);
  assert.equal(buckets.Retire[0].spend, 30000);
});

// ─── CX1.5: risk aggregation ────────────────────────────────────────────────

test('CX1.5 risks: composes ownership/evidence with security/governance/economics signals', async () => {
  const t = `t-cx1-risk-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false, withEvidence: false });
  const risks = await executiveExperienceService.getRisks(t);
  assert.ok(risks.ownership.missingOwnership.some((r: { assetId: string }) => r.assetId === asset.id));
  assert.ok(risks.security.platformVerdict);
  assert.ok('economicsVerdict' in risks.economics);
});

// ─── CX1.6: proof pack aggregation ──────────────────────────────────────────

test('CX1.6 proof packs: zero packs reported honestly, never fabricated', async () => {
  const t = `t-cx1-pp-${randomUUID()}`;
  const proofPacks = await executiveExperienceService.getProofPacks(t);
  assert.equal(proofPacks.summary.packCount, 0);
  assert.deepEqual(proofPacks.byType, {});
});

// ─── CX1.8: action center ───────────────────────────────────────────────────

test('CX1.8 actions: zero actions reported honestly', async () => {
  const t = `t-cx1-actions-${randomUUID()}`;
  const actions = await executiveExperienceService.getActions(t);
  assert.equal(actions.totalActions, 0);
  assert.equal(actions.buckets.Pending, 0);
});

// ─── CX1.9: consolidation findings ──────────────────────────────────────────

test('CX1.9 consolidation: findings are a reporting-only array, never empty for this codebase today', () => {
  const findings = executiveExperienceService.getConsolidationFindings();
  assert.ok(Array.isArray(findings));
  assert.ok(findings.length > 0);
  for (const f of findings) assert.ok(f.type && f.description);
});

// ─── CX1.3: authority consolidation layer ──────────────────────────────────

test('CX1.3 consolidation layer: every registered authority resolves to a uniform, honest view', async () => {
  const t = `t-cx1-consolidation-${randomUUID()}`;
  const views = await getConsolidatedAuthorityViews(t);
  assert.ok(views.length > 0);
  for (const v of views) {
    assert.ok(v.id && v.name);
    assert.ok(['VALUE', 'INVESTMENT', 'RISK', 'DECISION', 'OPERATIONS'].includes(v.category));
    assert.ok(['READY', 'PARTIAL', 'NOT_READY'].includes(v.readiness));
    assert.ok(v.findingsCount >= 0);
  }
});

// ─── CX1.7/CX1.10: executive experience authority ──────────────────────────

test('CX1.10 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-cx1-auth-${randomUUID()}`;
  const result = await getExecutiveExperienceAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'EXECUTIVE_EXPERIENCE_AUTHORITY');
});

test('CX1.10 authority: real seeded data improves the verdict', async () => {
  const t = `t-cx1-auth-b-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 80000, measuredValue: 200000, evidenceCount: 2 });
  const result = await getExecutiveExperienceAuthority(t);
  assert.ok(result.score > 0);
});

// ─── tenant isolation ───────────────────────────────────────────────────────

test('CX1 tenant isolation: dashboard, decisions, and risks never mix data across tenants', async () => {
  const tA = `t-cx1-iso-a-${randomUUID()}`;
  const tB = `t-cx1-iso-b-${randomUUID()}`;
  await seedAsset(tA, { annualSpend: 70000, evidenceCount: 1 });

  const dashboardB = await executiveExperienceService.getDashboard(tB);
  assert.equal(dashboardB.value.totalAssets, 0);

  const decisionsB = await executiveExperienceService.getDecisions(tB);
  assert.equal(decisionsB.Retire.length + decisionsB.Renew.length + decisionsB.Optimise.length + decisionsB.Expand.length + decisionsB.Review.length, 0);

  const risksB = await executiveExperienceService.getRisks(tB);
  assert.equal(risksB.ownership.missingOwnership.length, 0);
});
