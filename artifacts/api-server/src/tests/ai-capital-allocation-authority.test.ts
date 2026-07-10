import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';
import { aiValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { aiIntelligenceRepository } from '../lib/ai-economic-control/ai-intelligence';
import { aiCapitalAllocationDecisionService } from '../lib/ai-capital-allocation-authority/ai-capital-allocation-authority-service';
import { getAICapitalAllocationAuthority } from '../lib/ai-capital-allocation-authority/ai-capital-allocation-authority';

function seedSpend(tenantId: string, assetId: string, totalSpend: number) {
  const now = new Date().toISOString();
  aiIntelligenceRepository.upsertSpend({
    id: randomUUID(), tenantId, assetId, assetType: 'MODEL', vendor: 'TEST',
    periodStart: now, periodEnd: now, currency: 'USD', totalSpend,
    tokenSpend: 0, inferenceSpend: 0, subscriptionSpend: 0, seatSpend: 0,
    workflowSpend: 0, agentSpend: 0, source: 'TEST', metadata: {}, createdAt: now,
  } as any);
}

function seedAttribution(tenantId: string, assetId: string, opts: { withEvidence?: boolean; valueAmount?: number; confidenceLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED' } = {}) {
  const now = new Date().toISOString();
  const attribution = {
    id: randomUUID(), tenantId, assetId, attributionType: 'PRODUCTIVITY_GAIN' as const,
    attributionMethod: 'DIRECT_EVIDENCE' as const,
    attributedValueAmount: opts.valueAmount ?? 1000,
    attributedValueCurrency: 'USD', sourceSystem: 'TEST', sourceReference: 'ref',
    createdAt: now, updatedAt: now, metadata: {}, confidenceScore: 80, confidenceLevel: opts.confidenceLevel ?? 'HIGH',
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

async function seedInitiative(tenantId: string, assetId: string, opts: {
  withSpend?: boolean; spendAmount?: number; withOutcome?: boolean; withAttribution?: boolean;
  withEvidence?: boolean; valueAmount?: number; confidenceLevel?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';
  withOwner?: boolean; objectiveId?: string;
} = {}) {
  const initiative = await aiInitiativePortfolioService.createInitiative({
    tenantId, name: 'Support Copilot', sourceSystem: 'TEST', sourceReference: randomUUID(),
    ownerName: opts.withOwner === false ? undefined : 'Jane Doe',
  });
  await aiInitiativePortfolioService.linkAsset(tenantId, initiative.id, assetId);
  if (opts.withSpend !== false) seedSpend(tenantId, assetId, opts.spendAmount ?? 1000);
  if (opts.withOutcome !== false) {
    const outcome = economicOutcomeAttributionService.createEconomicOutcome({ tenantId, assetId, assetType: 'AI_ASSET', name: 'Faster resolution' });
    await aiInitiativePortfolioService.linkOutcome(tenantId, initiative.id, outcome.id);
  }
  if (opts.withAttribution !== false) {
    const attribution = seedAttribution(tenantId, assetId, { withEvidence: opts.withEvidence, valueAmount: opts.valueAmount, confidenceLevel: opts.confidenceLevel });
    await aiInitiativePortfolioService.linkAttribution(tenantId, initiative.id, attribution.id);
  }
  if (opts.objectiveId) await aiInitiativePortfolioService.linkObjective(tenantId, initiative.id, opts.objectiveId);
  return { initiative, assetId };
}

// ─── No-Fabrication Tests ───────────────────────────────────────────────────

test('E2.1 no-fabrication: unknown economics produces REVIEW', async () => {
  const t = `t-e2-1-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-1', { withSpend: false });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'REVIEW');
});

test('E2.2 no-fabrication: no evidence cannot produce EXPAND', async () => {
  const t = `t-e2-2-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-2', { withEvidence: false });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.notEqual(rec.decision, 'EXPAND');
});

// ─── Decision Path Tests ─────────────────────────────────────────────────────

test('E2.3 decision: EXPAND path — READY economics, HIGH confidence, evidence, value', async () => {
  const t = `t-e2-3-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-3');
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'EXPAND');
  assert.ok(rec.rationale.length > 0);
});

test('E2.4 decision: KEEP path — adequate evidence but economics merely PARTIAL', async () => {
  const t = `t-e2-4-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-4', { confidenceLevel: 'MODERATE' });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'KEEP');
});

test('E2.5 decision: OPTIMISE path — known spend and value but ROI below 1', async () => {
  const t = `t-e2-5-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-5', { spendAmount: 5000, valueAmount: 1000, confidenceLevel: 'MODERATE' });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'OPTIMISE');
});

test('E2.6 decision: CONSOLIDATE path — shared objective overlap with known value', async () => {
  const t = `t-e2-6-${randomUUID()}`;
  const objectiveId = randomUUID();
  economicOutcomeAttributionService.createBusinessObjective({ tenantId: t, id: objectiveId, name: 'Shared objective' } as any);
  const { initiative } = await seedInitiative(t, 'asset-6a', { objectiveId });
  await seedInitiative(t, 'asset-6b', { objectiveId });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'CONSOLIDATE');
});

test('E2.7 decision: RETIRE path — no outcomes, no value signals, no evidence', async () => {
  const t = `t-e2-7-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-7', { withOutcome: false, withAttribution: false });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'RETIRE');
});

test('E2.8 decision: REVIEW path — ownership gap', async () => {
  const t = `t-e2-8-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-8', { withOwner: false });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.equal(rec.decision, 'REVIEW');
});

// ─── Confidence Tests ────────────────────────────────────────────────────────

test('E2.9 confidence: missing owner caps recommendation confidence at 60', async () => {
  const t = `t-e2-9-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-9', { withOwner: false });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  assert.ok(rec.confidenceScore <= 60);
});

test('E2.10 confidence: recommendation confidence cannot exceed economics confidence', async () => {
  const t = `t-e2-10-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-10', { withSpend: false });
  const rec = await aiCapitalAllocationDecisionService.getInitiativeAllocation(t, initiative.id);
  const economics = await (await import('../lib/ai-economics-authority/ai-economics-authority-service')).aiEconomicsGraphAuthorityService.getInitiativeEconomics(t, initiative.id);
  assert.ok(rec.confidenceScore <= economics.confidenceScore);
});

// ─── Summary Tests ───────────────────────────────────────────────────────────

test('E2.11 summary: zero initiatives reports zero counts honestly', async () => {
  const t = `t-e2-11-${randomUUID()}`;
  const summary = await aiCapitalAllocationDecisionService.getSummary(t);
  assert.equal(summary.totalInitiatives, 0);
  assert.equal(summary.expandCount, 0);
});

test('E2.12 summary: counts reflect real per-initiative decisions', async () => {
  const t = `t-e2-12-${randomUUID()}`;
  await seedInitiative(t, 'asset-12a');
  await seedInitiative(t, 'asset-12b', { withSpend: false });
  const summary = await aiCapitalAllocationDecisionService.getSummary(t);
  assert.equal(summary.totalInitiatives, 2);
  assert.equal(summary.expandCount, 1);
  assert.equal(summary.reviewCount, 1);
});

// ─── Authority Tests ─────────────────────────────────────────────────────────

test('E2.13 authority: zero initiatives reports NOT_READY honestly', async () => {
  const t = `t-e2-13-${randomUUID()}`;
  const result = await getAICapitalAllocationAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'AI_CAPITAL_ALLOCATION_AUTHORITY');
});

test('E2.14 authority: a fully-evidenced initiative improves the verdict and reports real coverage', async () => {
  const t = `t-e2-14-${randomUUID()}`;
  await seedInitiative(t, 'asset-14');
  const result = await getAICapitalAllocationAuthority(t);
  assert.equal(result.allocationCoverage.total, 1);
  assert.equal(result.allocationCoverage.withDecision, 1);
  assert.ok(result.score > 0);
});

// ─── Narrative Tests ─────────────────────────────────────────────────────────

test('E2.15 narrative: reasoning references real factors, not invented ones', async () => {
  const t = `t-e2-15-${randomUUID()}`;
  const { initiative } = await seedInitiative(t, 'asset-15');
  const { recommendation, narrative } = await aiCapitalAllocationDecisionService.getInitiativeNarrative(t, initiative.id);
  assert.match(narrative, /Recommendation:/);
  assert.match(narrative, /Confidence:/);
  for (const factor of recommendation.rationale) assert.ok(narrative.includes(factor));
});

// ─── Tenant Tests ────────────────────────────────────────────────────────────

test('E2.16 tenant isolation: allocations never mix data across tenants', async () => {
  const tA = `t-e2-16a-${randomUUID()}`;
  const tB = `t-e2-16b-${randomUUID()}`;
  await seedInitiative(tA, 'asset-16a');
  const summaryB = await aiCapitalAllocationDecisionService.getSummary(tB);
  assert.equal(summaryB.totalInitiatives, 0);
});
