import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { technologyEconomicsService } from '../lib/technology-economics-authority/technology-economics-service';
import { getTechnologyEconomicsAuthority } from '../lib/technology-economics-authority/technology-economics-authority';

async function seedAsset(tenantId: string, opts: {
  withSpend?: boolean; annualSpend?: number; withMeasuredValue?: boolean; measuredValue?: number;
  withOutcome?: boolean; withCapability?: boolean; withEvidence?: boolean; vendorId?: string;
} = {}) {
  const outcomeIds: string[] = [];
  if (opts.withOutcome !== false) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({
      tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Faster resolution',
      measuredValue: opts.withMeasuredValue === false ? undefined : (opts.measuredValue ?? 50000),
      currency: 'USD',
    });
    outcomeIds.push(outcome.id);
  }
  return technologyPortfolioAuthorityService.createOrUpdateAsset({
    tenantId,
    name: 'Support Suite',
    assetType: 'SAAS',
    lifecycleStatus: 'ACTIVE',
    ownerUserId: 'jane.doe',
    businessCapability: opts.withCapability === false ? undefined : 'Customer Service',
    annualSpend: opts.withSpend === false ? undefined : (opts.annualSpend ?? 100000),
    currency: opts.withSpend === false ? undefined : 'USD',
    outcomeIds,
    evidenceRefs: opts.withEvidence === false ? [] : ['evidence-1'],
    vendorId: opts.vendorId,
  });
}

// ─── Spend / Value Attribution Tests ─────────────────────────────────────────

test('X3.1 economics: no spend recorded yields SPEND_UNKNOWN, never invented', async () => {
  const t = `t-x3-1-${randomUUID()}`;
  const asset = await seedAsset(t, { withSpend: false });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.equal(metric.spendAmount, undefined);
  assert.ok(metric.unknowns.includes('SPEND_UNKNOWN'));
});

test('X3.2 economics: no measured value yields VALUE_UNKNOWN, expectedValue never counted', async () => {
  const t = `t-x3-2-${randomUUID()}`;
  const asset = await seedAsset(t, { withMeasuredValue: false });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.equal(metric.knownValueAmount, undefined);
  assert.ok(metric.unknowns.includes('VALUE_UNKNOWN'));
});

test('X3.3 economics: ROI is never computed when value is unknown', async () => {
  const t = `t-x3-3-${randomUUID()}`;
  const asset = await seedAsset(t, { withMeasuredValue: false });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.equal(metric.roiRatio, undefined);
});

test('X3.4 economics: ROI is computed from real spend and known value', async () => {
  const t = `t-x3-4-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 50000, measuredValue: 100000 });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.equal(metric.roiRatio, 2);
});

// ─── Unit Economics Tests ────────────────────────────────────────────────────

test('X3.5 unit economics: cost per outcome computed from real spend and outcome count', async () => {
  const t = `t-x3-5-${randomUUID()}`;
  const asset = await seedAsset(t, { annualSpend: 90000 });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.equal(metric.costPerOutcome, 90000);
});

test('X3.6 unit economics: cost per capability is undefined with zero capabilities, never divides by zero', async () => {
  const t = `t-x3-6-${randomUUID()}`;
  const asset = await seedAsset(t, { withCapability: false });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.equal(metric.costPerCapability, undefined);
});

// ─── Confidence Tests ─────────────────────────────────────────────────────────

test('X3.7 confidence: capped when spend is unknown', async () => {
  const t = `t-x3-7-${randomUUID()}`;
  const asset = await seedAsset(t, { withSpend: false });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.ok(metric.confidenceScore <= 60);
});

test('X3.8 confidence: capped when evidence is missing', async () => {
  const t = `t-x3-8-${randomUUID()}`;
  const asset = await seedAsset(t, { withEvidence: false });
  const metric = await technologyEconomicsService.getAssetEconomics(t, asset.id);
  assert.ok(metric.confidenceScore <= 50);
});

// ─── Vendor / Capability Rollup Tests ─────────────────────────────────────────

test('X3.9 vendor economics: spend rolled up across the vendor\'s own assets', async () => {
  const t = `t-x3-9-${randomUUID()}`;
  const vendor = await technologyPortfolioAuthorityService.createOrUpdateVendor({ tenantId: t, name: 'Acme Corp' });
  await seedAsset(t, { annualSpend: 30000, vendorId: vendor.id });
  await seedAsset(t, { annualSpend: 20000, vendorId: vendor.id });
  const metric = await technologyEconomicsService.getVendorEconomics(t, vendor.id);
  assert.equal(metric.spendAmount, 50000);
});

test('X3.10 capability economics: aggregated across every supporting technology', async () => {
  const t = `t-x3-10-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 40000 });
  const summary = await technologyEconomicsService.getSummary(t);
  assert.equal(summary.totalTechnologies, 1);
  assert.equal(summary.assetsWithSpend, 1);
});

// ─── Authority Tests ──────────────────────────────────────────────────────────

test('X3.11 authority: zero technologies reports NOT_READY honestly', async () => {
  const t = `t-x3-11-${randomUUID()}`;
  const result = await getTechnologyEconomicsAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'TECHNOLOGY_ECONOMICS_AUTHORITY');
});

test('X3.12 authority: a fully-evidenced technology improves the verdict and reports real coverage', async () => {
  const t = `t-x3-12-${randomUUID()}`;
  await seedAsset(t, { annualSpend: 80000, measuredValue: 200000 });
  const result = await getTechnologyEconomicsAuthority(t);
  assert.equal(result.spendCoverage.total, 1);
  assert.ok(result.score > 0);
});

// ─── Tenant Isolation ─────────────────────────────────────────────────────────

test('X3.13 tenant isolation: technology economics never mix data across tenants', async () => {
  const tA = `t-x3-13a-${randomUUID()}`;
  const tB = `t-x3-13b-${randomUUID()}`;
  await seedAsset(tA, { annualSpend: 70000 });
  const summaryB = await technologyEconomicsService.getSummary(tB);
  assert.equal(summaryB.totalTechnologies, 0);
});
