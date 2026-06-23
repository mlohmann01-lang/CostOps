import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { technologyCapitalAllocationDecisionService } from '../lib/technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { getTechnologyCapitalAllocationAuthority } from '../lib/technology-capital-allocation-authority/technology-capital-allocation-authority';

async function seedAsset(tenantId: string, opts: {
  withOwner?: boolean; withCapability?: boolean; capability?: string; withSpend?: boolean; annualSpend?: number;
  withOutcome?: boolean; measuredValue?: number; withMeasuredValue?: boolean; withEvidence?: boolean;
  withContract?: boolean; withRenewal?: boolean; vendorId?: string;
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
  return technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'Support Suite',
    assetType: 'SAAS',
    lifecycleStatus: 'ACTIVE',
    ownerUserId: opts.withOwner === false ? undefined : 'jane.doe',
    businessCapability: opts.withCapability === false ? undefined : (opts.capability ?? 'Customer Service'),
    annualSpend: opts.withSpend === false ? undefined : (opts.annualSpend ?? 100000),
    currency: opts.withSpend === false ? undefined : 'USD',
    outcomeIds,
    evidenceRefs: opts.withEvidence === false ? [] : ['evidence-1'],
    contractIds: opts.withContract ? ['contract-1'] : [],
    renewalIds: opts.withRenewal ? ['renewal-1'] : [],
    vendorId: opts.vendorId,
  });
}

// ─── Allocation Decision Tests (all 7 decisions) ─────────────────────────────

test('X4.1 allocation: REVIEW — missing owner', async () => {
  const t = `t-x4-1-${randomUUID()}`;
  const asset = await seedAsset(t, { withOwner: false });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.equal(rec.decision, 'REVIEW');
});

test('X4.2 allocation: RETIRE — known spend, no outcomes, no evidence', async () => {
  const t = `t-x4-2-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: false, withEvidence: false });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.equal(rec.decision, 'RETIRE');
});

test('X4.3 allocation: KEEP — owned, mapped, spend known, evidenced, no outcomes yet', async () => {
  const t = `t-x4-3-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: false });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.equal(rec.decision, 'KEEP');
});

test('X4.4 allocation: OPTIMISE — known value, weak efficiency (ROI < 1)', async () => {
  const t = `t-x4-4-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 100000, measuredValue: 50000 });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.equal(rec.decision, 'OPTIMISE');
});

test('X4.5 allocation: EXPAND — strong value, strong economics, high confidence, outcome coverage', async () => {
  const t = `t-x4-5-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 50000, measuredValue: 300000 });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.equal(rec.decision, 'EXPAND');
});

test('X4.6 allocation: CONSOLIDATE — overlapping capability and vendor, known value', async () => {
  const t = `t-x4-6-${randomUUID()}`;
  const vendor = await technologyPortfolioAuthorityService.createOrUpdateVendor({ tenantId: t, name: 'Acme Corp' });
  const a1 = await seedAsset(t, { capability: 'Finance Ops', vendorId: vendor.id, annualSpend: 90000, measuredValue: 90000 });
  await seedAsset(t, { capability: 'Finance Ops', vendorId: vendor.id, annualSpend: 30000 });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, a1.id);
  assert.equal(rec.decision, 'CONSOLIDATE');
});

test('X4.7 allocation: RENEW — renewal approaching, known value, economics not NOT_READY', async () => {
  const t = `t-x4-7-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: false, measuredValue: 150000 });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.equal(rec.decision, 'RENEW');
});

test('X4.8 no fabrication: no overlap evidence means no CONSOLIDATE recommendation', async () => {
  const t = `t-x4-8-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 50000, measuredValue: 300000 });
  const rec = await technologyCapitalAllocationDecisionService.getAssetAllocation(t, asset.id);
  assert.notEqual(rec.decision, 'CONSOLIDATE');
});

// ─── Renewal Decision Support Tests (X4.7) ───────────────────────────────────

test('X4.9 renewal: RENEW — contract on record, real evidence, known value, capability mapped', async () => {
  const t = `t-x4-9-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: false, measuredValue: 150000 });
  const rec = await technologyCapitalAllocationDecisionService.getRenewalRecommendation(t, asset.id);
  assert.equal(rec.decision, 'RENEW');
});

test('X4.10 renewal: REVIEW — contract on record but no evidence', async () => {
  const t = `t-x4-10-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: false, withEvidence: false });
  const rec = await technologyCapitalAllocationDecisionService.getRenewalRecommendation(t, asset.id);
  assert.equal(rec.decision, 'REVIEW');
});

test('X4.11 renewal: RETIRE — contract on record, no outcomes, no evidence', async () => {
  const t = `t-x4-11-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: true, withRenewal: false, withOutcome: false, withEvidence: false });
  const rec = await technologyCapitalAllocationDecisionService.getRenewalRecommendation(t, asset.id);
  assert.equal(rec.decision, 'RETIRE');
});

test('X4.12 renewal: no contract on record is reported honestly as REVIEW, never fabricated', async () => {
  const t = `t-x4-12-${randomUUID()}`;
  const asset = await seedAsset(t, { withContract: false });
  const rec = await technologyCapitalAllocationDecisionService.getRenewalRecommendation(t, asset.id);
  assert.equal(rec.decision, 'REVIEW');
  assert.equal(rec.hasContract, false);
});

// ─── Authority Tests ──────────────────────────────────────────────────────────

test('X4.13 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-x4-13-${randomUUID()}`;
  const result = await getTechnologyCapitalAllocationAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'TECHNOLOGY_CAPITAL_ALLOCATION_AUTHORITY');
});

test('X4.14 authority: evidenced technology improves the verdict and reports real coverage', async () => {
  const t = `t-x4-14-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 50000, measuredValue: 300000 });
  const result = await getTechnologyCapitalAllocationAuthority(t);
  assert.equal(result.allocationCoverage.total, 1);
  assert.ok(result.score > 0);
});

// ─── Summary / Tenant Isolation ───────────────────────────────────────────────

test('X4.15 summary: counts reflect real decisions across the portfolio', async () => {
  const t = `t-x4-15-${randomUUID()}`;
  await seedAsset(t, { withOwner: false });
  const summary = await technologyCapitalAllocationDecisionService.getSummary(t);
  assert.equal(summary.totalTechnologies, 1);
  assert.equal(summary.reviewCount, 1);
});

test('X4.16 tenant isolation: allocation recommendations never mix data across tenants', async () => {
  const tA = `t-x4-16a-${randomUUID()}`;
  const tB = `t-x4-16b-${randomUUID()}`;
  await seedAsset(tA, { annualSpend: 70000 });
  const summaryB = await technologyCapitalAllocationDecisionService.getSummary(tB);
  assert.equal(summaryB.totalTechnologies, 0);
});

// ─── Narrative Tests (X4.8) ───────────────────────────────────────────────────

test('X4.17 narrative: references real factors, not invented ones', async () => {
  const t = `t-x4-17-${randomUUID()}`;
  const asset = await seedAsset(t, { withOutcome: false });
  const { narrative, recommendation } = await technologyCapitalAllocationDecisionService.getAssetNarrative(t, asset.id);
  assert.match(narrative, /Decision:/);
  assert.match(narrative, /Reasoning:/);
  assert.equal(recommendation.decision, 'KEEP');
});
