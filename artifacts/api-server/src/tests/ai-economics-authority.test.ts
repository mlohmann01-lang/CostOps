import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';
import { aiValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { aiIntelligenceRepository } from '../lib/ai-economic-control/ai-intelligence';
import { aiEconomicsGraphAuthorityService } from '../lib/ai-economics-authority/ai-economics-authority-service';
import { getAIEconomicsAuthority } from '../lib/ai-economics-authority/ai-economics-authority';

function seedSpend(tenantId: string, assetId: string, totalSpend: number) {
  const now = new Date().toISOString();
  aiIntelligenceRepository.upsertSpend({
    id: randomUUID(), tenantId, assetId, assetType: 'MODEL', vendor: 'TEST',
    periodStart: now, periodEnd: now, currency: 'USD', totalSpend,
    tokenSpend: 0, inferenceSpend: 0, subscriptionSpend: 0, seatSpend: 0,
    workflowSpend: 0, agentSpend: 0, source: 'TEST', metadata: {}, createdAt: now,
  } as any);
}

function seedAttribution(tenantId: string, assetId: string, opts: { withEvidence?: boolean; withValue?: boolean } = {}) {
  const now = new Date().toISOString();
  const attribution = {
    id: randomUUID(), tenantId, assetId, attributionType: 'PRODUCTIVITY_GAIN' as const,
    attributionMethod: 'DIRECT_EVIDENCE' as const,
    attributedValueAmount: opts.withValue === false ? 0 : 1000,
    attributedValueCurrency: 'USD', sourceSystem: 'TEST', sourceReference: 'ref',
    createdAt: now, updatedAt: now, metadata: {}, confidenceScore: 80, confidenceLevel: 'HIGH' as const,
  };
  aiValueAttributionRepository.upsertAttribution(attribution as any);
  if (opts.withEvidence !== false) {
    aiValueAttributionRepository.upsertEvidence({
      id: randomUUID(), tenantId, attributionId: attribution.id, evidenceType: 'BUSINESS_METRIC',
      evidenceStrength: 'VERIFIED', source: 'TEST', timestamp: now, createdAt: now,
    } as any);
  }
  return attribution;
}

async function seedInitiative(tenantId: string, assetId: string, opts: { withSpend?: boolean; withOutcome?: boolean; withAttribution?: boolean; withEvidence?: boolean } = {}) {
  const initiative = await aiInitiativePortfolioService.createInitiative({
    tenantId, name: 'Support Copilot', sourceSystem: 'TEST', sourceReference: randomUUID(), ownerName: 'Jane Doe',
  });
  await aiInitiativePortfolioService.linkAsset(tenantId, initiative.id, assetId);
  if (opts.withSpend !== false) seedSpend(tenantId, assetId, 1000);
  if (opts.withOutcome !== false) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId, assetType: 'AI_ASSET', name: 'Faster resolution' });
    await aiInitiativePortfolioService.linkOutcome(tenantId, initiative.id, outcome.id);
  }
  if (opts.withAttribution !== false) {
    const attribution = seedAttribution(tenantId, assetId, { withEvidence: opts.withEvidence });
    await aiInitiativePortfolioService.linkAttribution(tenantId, initiative.id, attribution.id);
  }
  return { initiative, assetId };
}

// ─── No-Fabrication Tests ───────────────────────────────────────────────────

test('E1.1 no-fabrication: no spend means spendAmount is undefined and SPEND_UNKNOWN is recorded', async () => {
  const t = `t-e1-1-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-1', { withSpend: false });
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.equal(metric.spendAmount, undefined);
  assert.ok(metric.unknowns.includes('SPEND_UNKNOWN'));
  assert.notEqual(metric.readiness, 'READY');
});

test('E1.2 no-fabrication: no known value means roiRatio is undefined and VALUE_UNKNOWN is recorded', async () => {
  const t = `t-e1-2-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-2', { withAttribution: false });
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.equal(metric.knownValueAmount, undefined);
  assert.equal(metric.roiRatio, undefined);
  assert.ok(metric.unknowns.includes('VALUE_UNKNOWN'));
});

test('E1.3 no-fabrication: no evidence caps confidence at 50 and records EVIDENCE_UNKNOWN', async () => {
  const t = `t-e1-3-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-3', { withEvidence: false });
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.ok(metric.unknowns.includes('EVIDENCE_UNKNOWN'));
  assert.ok(metric.confidenceScore <= 50);
});

// ─── Unit Economics Tests ───────────────────────────────────────────────────

test('E1.4 unit economics: cost per outcome divides spend by outcome count', async () => {
  const t = `t-e1-4-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-4');
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.equal(metric.outcomeCount, 1);
  assert.equal(metric.costPerOutcome, metric.spendAmount);
});

test('E1.5 unit economics: zero outcomes never divides by zero', async () => {
  const t = `t-e1-5-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-5', { withOutcome: false });
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.equal(metric.outcomeCount, 0);
  assert.equal(metric.costPerOutcome, undefined);
});

test('E1.6 unit economics: roiRatio is only computed when both spend and value are known', async () => {
  const t = `t-e1-6-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-6');
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.equal(metric.roiRatio, (metric.knownValueAmount as number) / (metric.spendAmount as number));
});

// ─── Confidence Tests ────────────────────────────────────────────────────────

test('E1.7 confidence: missing spend caps confidence at 60', async () => {
  const t = `t-e1-7-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-7', { withSpend: false });
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.ok(metric.confidenceScore <= 60);
});

test('E1.8 confidence: missing value caps confidence at 70', async () => {
  const t = `t-e1-8-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-8', { withAttribution: false });
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.ok(metric.confidenceScore <= 70);
});

// ─── Initiative / Asset Economics Tests ─────────────────────────────────────

test('E1.9 initiative economics: rolls up spend from linked assets', async () => {
  const t = `t-e1-9-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-9');
  const metric = await aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.equal(metric.spendAmount, 1000);
  assert.equal(metric.subjectType, 'INITIATIVE');
});

test('E1.10 asset economics: isolated to the asset\'s own spend and value', async () => {
  const t = `t-e1-10-${randomUUID()}`;
  await seedInitiative(t, 'asset-10');
  const metric = await aiEconomicsGraphAuthorityService.getAssetEconomics(t, 'asset-10');
  assert.equal(metric.subjectType, 'AI_ASSET');
  assert.equal(metric.spendAmount, 1000);
});

test('E1.11 asset economics: unknown asset reports honest unknowns, not fabricated data', async () => {
  const t = `t-e1-11-${randomUUID()}`;
  const metric = await aiEconomicsGraphAuthorityService.getAssetEconomics(t, 'never-existed');
  assert.equal(metric.spendAmount, undefined);
  assert.ok(metric.unknowns.includes('SPEND_UNKNOWN'));
});

// ─── Summary Tests ───────────────────────────────────────────────────────────

test('E1.12 summary: zero initiatives reports zero counts honestly', async () => {
  const t = `t-e1-12-${randomUUID()}`;
  const summary = await aiEconomicsGraphAuthorityService.getSummary(t);
  assert.equal(summary.totalInitiatives, 0);
  assert.equal(summary.readyCount, 0);
  assert.equal(summary.averageConfidence, 0);
});

test('E1.13 summary: counts reflect real per-initiative readiness', async () => {
  const t = `t-e1-13-${randomUUID()}`;
  await seedInitiative(t, 'asset-13');
  await seedInitiative(t, 'asset-13b', { withSpend: false });
  const summary = await aiEconomicsGraphAuthorityService.getSummary(t);
  assert.equal(summary.totalInitiatives, 2);
  assert.equal(summary.initiativesWithSpend, 1);
  assert.ok(summary.unknownSpendCount >= 1);
});

// ─── Authority Tests ─────────────────────────────────────────────────────────

test('E1.14 authority: zero initiatives reports NOT_READY honestly', async () => {
  const t = `t-e1-14-${randomUUID()}`;
  const result = await getAIEconomicsAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'AI_ECONOMICS_AUTHORITY');
});

test('E1.15 authority: a fully-evidenced initiative improves the verdict and reports real coverage', async () => {
  const t = `t-e1-15-${randomUUID()}`;
  await seedInitiative(t, 'asset-15');
  const result = await getAIEconomicsAuthority(t);
  assert.equal(result.spendCoverage.total, 1);
  assert.equal(result.spendCoverage.withSpend, 1);
  assert.ok(result.score > 0);
});

// ─── Tenant Isolation ────────────────────────────────────────────────────────

test('E1.16 tenant isolation: economics never mix data across tenants', async () => {
  const tA = `t-e1-16a-${randomUUID()}`;
  const tB = `t-e1-16b-${randomUUID()}`;
  await seedInitiative(tA, 'asset-16a');
  const summaryB = await aiEconomicsGraphAuthorityService.getSummary(tB);
  assert.equal(summaryB.totalInitiatives, 0);
});

// ─── Narrative Tests ─────────────────────────────────────────────────────────

test('E1.17 narrative: produces a readable economics explanation without inventing ROI', async () => {
  const t = `t-e1-17-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-17', { withAttribution: false });
  const { narrative } = await aiEconomicsGraphAuthorityService.getInitiativeNarrative(t, initiative.id);
  assert.match(narrative, /ROI is not calculated/);
});
