import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createInMemoryAIInitiativePortfolioStores, AIInitiativePortfolioRepository } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { AIInitiativePortfolioService, aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';
import { getAIInitiativePortfolioAuthority } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-authority';
import { aiValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';

const makeService = (resolvers: any = {}) => new AIInitiativePortfolioService(new AIInitiativePortfolioRepository(createInMemoryAIInitiativePortfolioStores()), resolvers);

function seedAttribution(tenantId: string, opts: { confidenceScore?: number; evidenceStrength?: 'VERIFIED' | 'OBSERVED' | 'INFERRED' | 'ESTIMATED' } = {}) {
  const now = new Date().toISOString();
  const attribution = {
    id: randomUUID(),
    tenantId,
    attributionType: 'PRODUCTIVITY_GAIN' as const,
    attributionMethod: 'DIRECT_EVIDENCE' as const,
    attributedValueAmount: 1000,
    sourceSystem: 'TEST',
    sourceReference: 'ref',
    createdAt: now,
    updatedAt: now,
    metadata: {},
    confidenceScore: opts.confidenceScore,
  };
  aiValueAttributionRepository.upsertAttribution(attribution as any);
  aiValueAttributionRepository.upsertEvidence({
    id: randomUUID(), tenantId, attributionId: attribution.id, evidenceType: 'BUSINESS_METRIC',
    evidenceStrength: opts.evidenceStrength ?? 'VERIFIED', source: 'TEST', timestamp: now, createdAt: now,
  } as any);
  aiValueAttributionRepository.upsertContributor({
    id: randomUUID(), tenantId, attributionId: attribution.id, contributorType: 'ASSET', contributorId: 'asset-1', weight: 100, createdAt: now,
  } as any);
  return attribution;
}

// ─── Registry Tests ─────────────────────────────────────────────────────────

test('AI2.1 registry: create initiative with default lifecycle PROPOSED', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-1', name: 'Support Copilot', sourceSystem: 'TEST', sourceReference: 'r1' });
  assert.equal(i.lifecycle, 'PROPOSED');
  assert.ok(i.id);
});

test('AI2.2 registry: update initiative fields', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-2', name: 'Initiative', sourceSystem: 'TEST', sourceReference: 'r2' });
  const updated = await s.updateInitiative('t-ai2-2', i.id, { ownerName: 'Jane Doe', department: 'Engineering' });
  assert.equal(updated.ownerName, 'Jane Doe');
  assert.equal(updated.department, 'Engineering');
});

test('AI2.3 registry: list and get initiatives', async () => {
  const s = makeService();
  await s.createInitiative({ tenantId: 't-ai2-3', name: 'A', sourceSystem: 'TEST', sourceReference: 'r3a' });
  await s.createInitiative({ tenantId: 't-ai2-3', name: 'B', sourceSystem: 'TEST', sourceReference: 'r3b' });
  const list = await s.listInitiatives('t-ai2-3');
  assert.equal(list.length, 2);
  const fetched = await s.getInitiative('t-ai2-3', list[0].id);
  assert.ok(fetched);
});

test('AI2.4 registry: retire initiative sets lifecycle RETIRED and retiredAt', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-4', name: 'Old', sourceSystem: 'TEST', sourceReference: 'r4' });
  const retired = await s.retireInitiative('t-ai2-4', i.id);
  assert.equal(retired.lifecycle, 'RETIRED');
  assert.ok(retired.retiredAt);
});

// ─── Ownership Tests ────────────────────────────────────────────────────────

test('AI2.5 ownership: missing owner is reported, not invented', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-5', name: 'Unowned', sourceSystem: 'TEST', sourceReference: 'r5' });
  const ownership = await s.evaluateOwnership('t-ai2-5', i.id);
  assert.equal(ownership.hasOwner, false);
  assert.equal(ownership.complete, false);
  assert.ok(ownership.missing.includes('owner'));
});

test('AI2.6 ownership: complete ownership recognised when all fields present', async () => {
  const s = makeService();
  const i = await s.createInitiative({
    tenantId: 't-ai2-6', name: 'Owned', sourceSystem: 'TEST', sourceReference: 'r6',
    ownerName: 'Jane', executiveSponsor: 'CFO', department: 'Finance', costCentre: 'CC-1',
  });
  const ownership = await s.evaluateOwnership('t-ai2-6', i.id);
  assert.equal(ownership.complete, true);
  assert.deepEqual(ownership.missing, []);
});

// ─── Lifecycle Tests ────────────────────────────────────────────────────────

test('AI2.7 lifecycle: cannot become OPERATIONAL without an owner', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-7', name: 'No Owner', sourceSystem: 'TEST', sourceReference: 'r7' });
  const check = await s.validateLifecycleTransition('t-ai2-7', i.id, 'OPERATIONAL');
  assert.equal(check.allowed, false);
  await assert.rejects(() => s.updateInitiative('t-ai2-7', i.id, { lifecycle: 'OPERATIONAL' }));
});

test('AI2.8 lifecycle: cannot become SCALING without outcomes', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-8', name: 'No Outcomes', sourceSystem: 'TEST', sourceReference: 'r8', ownerName: 'Jane' });
  const check = await s.validateLifecycleTransition('t-ai2-8', i.id, 'SCALING');
  assert.equal(check.allowed, false);
});

test('AI2.9 lifecycle: allowed transition succeeds once requirements are met', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-9', name: 'Ready', sourceSystem: 'TEST', sourceReference: 'r9', ownerName: 'Jane' });
  await s.linkOutcome('t-ai2-9', i.id, 'outcome-1');
  const check = await s.validateLifecycleTransition('t-ai2-9', i.id, 'SCALING');
  assert.equal(check.allowed, true);
  const updated = await s.updateInitiative('t-ai2-9', i.id, { lifecycle: 'SCALING' });
  assert.equal(updated.lifecycle, 'SCALING');
});

// ─── Aggregation Tests ──────────────────────────────────────────────────────

test('AI2.10 aggregation: outcome summary reflects linked outcomes, assets and attributions', async () => {
  const s = makeService();
  const tenantId = 't-ai2-10';
  const i = await s.createInitiative({ tenantId, name: 'Aggregated', sourceSystem: 'TEST', sourceReference: 'r10' });
  await s.linkOutcome(tenantId, i.id, 'outcome-1');
  await s.linkAsset(tenantId, i.id, 'asset-1');
  const attribution = seedAttribution(tenantId, { confidenceScore: 90 });
  await s.linkAttribution(tenantId, i.id, attribution.id);

  const summary = await s.getInitiativeOutcomeSummary(tenantId, i.id);
  assert.equal(summary.outcomeCount, 1);
  assert.equal(summary.assetCount, 1);
  assert.equal(summary.attributionCount, 1);
  assert.equal(summary.evidenceCount, 1);
});

test('AI2.11 aggregation: zero linkages produce zeroed, honest summary', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-11', name: 'Empty', sourceSystem: 'TEST', sourceReference: 'r11' });
  const summary = await s.getInitiativeOutcomeSummary('t-ai2-11', i.id);
  assert.equal(summary.outcomeCount, 0);
  assert.equal(summary.attributionCount, 0);
});

// ─── Confidence Tests ───────────────────────────────────────────────────────

test('AI2.12 confidence: no attributions yields LOW, not fabricated higher confidence', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-12', name: 'No Evidence', sourceSystem: 'TEST', sourceReference: 'r12' });
  const confidence = await s.getInitiativeConfidence('t-ai2-12', i.id);
  assert.equal(confidence.level, 'LOW');
  assert.equal(confidence.score, 0);
});

test('AI2.13 confidence: strong attribution evidence rolls up to HIGH/VERIFIED', async () => {
  const s = makeService();
  const tenantId = 't-ai2-13';
  const i = await s.createInitiative({ tenantId, name: 'Strong', sourceSystem: 'TEST', sourceReference: 'r13' });
  const attribution = seedAttribution(tenantId, { confidenceScore: 95, evidenceStrength: 'VERIFIED' });
  await s.linkAttribution(tenantId, i.id, attribution.id);
  const confidence = await s.getInitiativeConfidence(tenantId, i.id);
  assert.ok(confidence.score > 0);
  assert.ok(['HIGH', 'VERIFIED'].includes(confidence.level));
});

// ─── Recommendation Tests ───────────────────────────────────────────────────

test('AI2.14 recommendation: missing owner forces REVIEW, never EXPAND/RETIRE', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-14', name: 'Unowned', sourceSystem: 'TEST', sourceReference: 'r14' });
  const rec = await s.recommendAction('t-ai2-14', i.id);
  assert.equal(rec.action, 'REVIEW');
});

test('AI2.15 recommendation: retired initiative recommends RETIRE', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't-ai2-15', name: 'Done', sourceSystem: 'TEST', sourceReference: 'r15', ownerName: 'Jane' });
  await s.retireInitiative('t-ai2-15', i.id);
  const rec = await s.recommendAction('t-ai2-15', i.id);
  assert.equal(rec.action, 'RETIRE');
});

test('AI2.16 recommendation: strong evidence-backed outcomes support EXPAND', async () => {
  const s = makeService();
  const tenantId = 't-ai2-16';
  const i = await s.createInitiative({ tenantId, name: 'Winning', sourceSystem: 'TEST', sourceReference: 'r16', ownerName: 'Jane' });
  await s.linkOutcome(tenantId, i.id, 'outcome-1');
  const attribution = seedAttribution(tenantId, { confidenceScore: 95, evidenceStrength: 'VERIFIED' });
  await s.linkAttribution(tenantId, i.id, attribution.id);
  const rec = await s.recommendAction(tenantId, i.id);
  assert.equal(rec.action, 'EXPAND');
});

test('AI2.17 recommendation never uses spend — recommendation is identical regardless of economics links', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 1_000_000, totalAttributedValue: 0, verifiedValue: 0, protectedValue: 0, verdict: 'RETIRE', confidence: 0.9 }) });
  const tenantId = 't-ai2-17';
  const i = await s.createInitiative({ tenantId, name: 'Spendy', sourceSystem: 'TEST', sourceReference: 'r17', ownerName: 'Jane' });
  await s.linkOutcome(tenantId, i.id, 'outcome-1');
  const attribution = seedAttribution(tenantId, { confidenceScore: 95, evidenceStrength: 'VERIFIED' });
  await s.linkAttribution(tenantId, i.id, attribution.id);
  await s.linkEconomics(tenantId, i.id, 'profile-1');
  const rec = await s.recommendAction(tenantId, i.id);
  assert.equal(rec.action, 'EXPAND');
});

// ─── Authority Tests ────────────────────────────────────────────────────────

test('AI2.18 authority: no initiatives yields NOT_READY without fabricating a verdict', async () => {
  const result = await getAIInitiativePortfolioAuthority('t-ai2-18-empty');
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
});

test('AI2.19 authority: well-governed portfolio reaches at least PARTIAL', async () => {
  const tenantId = 't-ai2-19';
  const i = await aiInitiativePortfolioService.createInitiative({ tenantId, name: 'Governed', sourceSystem: 'TEST', sourceReference: 'r19', ownerName: 'Jane' });
  await aiInitiativePortfolioService.linkOutcome(tenantId, i.id, 'outcome-1');
  await aiInitiativePortfolioService.linkAsset(tenantId, i.id, 'asset-1');
  const attribution = seedAttribution(tenantId, { confidenceScore: 90, evidenceStrength: 'VERIFIED' });
  await aiInitiativePortfolioService.linkAttribution(tenantId, i.id, attribution.id);

  const result = await getAIInitiativePortfolioAuthority(tenantId);
  assert.notEqual(result.verdict, 'NOT_READY');
  assert.ok(result.ownership.ownedInitiatives >= 1);
  assert.ok(result.outcomeCoverage.initiativesWithOutcomes >= 1);
});
