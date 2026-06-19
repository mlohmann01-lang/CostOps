import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryAICapitalAllocationStores, AICapitalAllocationRepository } from '../lib/ai-capital-allocation/ai-capital-allocation-repository';
import { AICapitalAllocationAuthorityService } from '../lib/ai-capital-allocation/ai-capital-allocation-service';
import { backfillCanonicalAICapitalAllocations, AI_CAPITAL_ALLOCATION_CANONICAL_NAMES } from '../lib/ai-capital-allocation/ai-capital-allocation-backfill';
import { buildAICapitalAllocationSummaryMetrics, buildAICapitalAllocationProofPackEvidence } from '../lib/executive-proof-packs/ai-capital-allocation-proof-pack-evidence';

const makeService = (resolvers: any = {}) => new AICapitalAllocationAuthorityService(new AICapitalAllocationRepository(createInMemoryAICapitalAllocationStores()), resolvers);

const lineage = (overrides: Partial<{ portfolioVerdict: string; economicVerdict: string; attributedValue: number; verifiedValue: number; protectedValue: number; totalSpend: number; valueToCostRatio: number; confidence: number }> = {}) => async (_t: string, initiativeId: string) => ({
  initiativeId,
  initiativeName: 'Initiative',
  portfolioVerdict: 'MAINTAIN',
  economicVerdict: 'MAINTAIN',
  attributedValue: 1000,
  verifiedValue: 900,
  protectedValue: 500,
  totalSpend: 500,
  valueToCostRatio: 2,
  confidence: 0.6,
  ...overrides,
});

test('1. allocation creation captures canonical fields', async () => {
  const s = makeService();
  const a = await s.createAllocation({ tenantId: 't1', initiativeId: 'initiative-1', currentInvestmentAmount: 1000, currency: 'USD' });
  assert.equal(a.initiativeId, 'initiative-1');
  assert.equal(a.currentInvestmentAmount, 1000);
  assert.equal(a.allocationVerdict, 'INSUFFICIENT_DATA');
  assert.ok(a.id);
});

test('2. INCREASE verdict applies for SCALE portfolio, EXPAND economics, protected value, and high confidence', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'SCALE', economicVerdict: 'EXPAND', protectedValue: 1000, confidence: 0.9 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-2', 1000);
  assert.equal(a.allocationVerdict, 'INCREASE');
  assert.equal(a.recommendedAction, 'EXPAND');
  assert.equal(a.recommendedInvestmentAmount, 1500);
});

test('3. MAINTAIN verdict applies for MAINTAIN portfolio with stable economics', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'MAINTAIN', economicVerdict: 'MAINTAIN' }) });
  const a = await s.evaluateAllocation('t1', 'initiative-3', 1000);
  assert.equal(a.allocationVerdict, 'MAINTAIN');
  assert.equal(a.recommendedAction, 'SUSTAIN');
  assert.equal(a.recommendedInvestmentAmount, 1000);
});

test('4. OPTIMISE verdict applies for OPTIMISE portfolio when attributed value exists but economics are weak', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'OPTIMISE', economicVerdict: 'OPTIMISE', attributedValue: 200 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-4', 1000);
  assert.equal(a.allocationVerdict, 'OPTIMISE');
  assert.equal(a.recommendedAction, 'EFFICIENCY_REVIEW');
});

test('5. PAUSE verdict applies for REVIEW portfolio or low confidence', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'REVIEW', confidence: 0.2 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-5', 1000);
  assert.equal(a.allocationVerdict, 'PAUSE');
  assert.equal(a.recommendedAction, 'HOLD');
});

test('6. REDUCE verdict applies for RETIRE portfolio with residual attributed value', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'RETIRE', economicVerdict: 'MAINTAIN', attributedValue: 300, confidence: 0.6 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-6', 1000);
  assert.equal(a.allocationVerdict, 'REDUCE');
  assert.equal(a.recommendedAction, 'SCALE_BACK');
  assert.equal(a.recommendedInvestmentAmount, 500);
});

test('7. STOP verdict applies when no value remains despite ongoing spend and strong evidence', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'RETIRE', economicVerdict: 'RETIRE', attributedValue: 0, totalSpend: 800, confidence: 0.9 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-7', 1000);
  assert.equal(a.allocationVerdict, 'STOP');
  assert.equal(a.recommendedAction, 'TERMINATE');
  assert.equal(a.recommendedInvestmentAmount, 0);
});

test('8. INSUFFICIENT_DATA verdict applies when no initiative lineage is resolvable', async () => {
  const s = makeService();
  const a = await s.evaluateAllocation('t1', 'initiative-8', 1000);
  assert.equal(a.allocationVerdict, 'INSUFFICIENT_DATA');
  assert.equal(a.recommendedAction, 'COLLECT_MORE_DATA');
});

test('9. Initiative Portfolio integration consumes resolved portfolio verdict without recomputing it', async () => {
  let calledWith: string | null = null;
  const s = makeService({ resolveInitiativeLineage: async (_t: string, id: string) => { calledWith = id; return (await lineage({ portfolioVerdict: 'SCALE', economicVerdict: 'EXPAND', protectedValue: 100, confidence: 0.9 })('t1', id)); } });
  await s.evaluateAllocation('t1', 'initiative-9', 1000);
  assert.equal(calledWith, 'initiative-9');
});

test('10. AI Economics integration drives the verdict via the resolved economic verdict', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'OPTIMISE', economicVerdict: 'INSUFFICIENT_DATA' }) });
  const a = await s.evaluateAllocation('t1', 'initiative-10', 1000);
  assert.equal(a.allocationVerdict, 'INSUFFICIENT_DATA');
});

test('11. AI Value Attribution integration drives the verdict via the resolved attributed value', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'OPTIMISE', economicVerdict: 'OPTIMISE', attributedValue: 0 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-11', 1000);
  assert.notEqual(a.allocationVerdict, 'OPTIMISE');
});

test('12. Protected Value weighting blocks INCREASE when protected value is absent even with strong economics', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'SCALE', economicVerdict: 'EXPAND', protectedValue: 0, confidence: 0.9 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-12', 1000);
  assert.notEqual(a.allocationVerdict, 'INCREASE');
});

test('13. portfolio summary aggregates verdict counts, capital at risk, and confidence', async () => {
  const initiatives = [{ id: 'i1', name: 'A' }, { id: 'i2', name: 'B' }];
  const s = makeService({
    listInitiatives: async () => initiatives,
    resolveInitiativeLineage: async (_t: string, id: string) => id === 'i1'
      ? lineage({ portfolioVerdict: 'SCALE', economicVerdict: 'EXPAND', protectedValue: 1000, confidence: 0.9 })('t1', id)
      : lineage({ portfolioVerdict: 'RETIRE', economicVerdict: 'RETIRE', attributedValue: 0, totalSpend: 800, confidence: 0.9 })('t1', id),
  });
  const summary = await s.getPortfolioAllocationSummary('t1');
  assert.equal(summary.initiativeCount, 2);
  assert.equal(summary.increaseCandidates, 1);
  assert.equal(summary.stopCandidates, 1);
  assert.ok(summary.capitalAtRisk >= 0);
});

test('14. recommendation generation prioritises increase and stop candidates by attributed value', async () => {
  const initiatives = [{ id: 'i1', name: 'A' }, { id: 'i2', name: 'B' }];
  const s = makeService({
    listInitiatives: async () => initiatives,
    resolveInitiativeLineage: async (_t: string, id: string) => id === 'i1'
      ? lineage({ portfolioVerdict: 'MAINTAIN', economicVerdict: 'MAINTAIN' })('t1', id)
      : lineage({ portfolioVerdict: 'SCALE', economicVerdict: 'EXPAND', protectedValue: 1000, confidence: 0.9 })('t1', id),
  });
  const recs = await s.getCapitalAllocationRecommendations('t1', 10);
  assert.equal(recs[0].initiativeId, 'i2');
  assert.equal(recs[0].allocationVerdict, 'INCREASE');
});

test('15. evidence linkage produces export-safe evidence records for allocations with confidence', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'SCALE', economicVerdict: 'EXPAND', protectedValue: 1000, confidence: 0.9 }) });
  const a = await s.evaluateAllocation('t1', 'initiative-15', 1000);
  const evidence = buildAICapitalAllocationProofPackEvidence([a]);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].targetId, 'initiative-15');
  assert.equal(evidence[0].integrityStatus, 'PASS');
});

test('16. proof pack integration summarises increase, maintain, optimise, pause, reduce, stop, and confidence', async () => {
  const a1 = { allocationVerdict: 'INCREASE', allocationConfidence: 0.9 } as any;
  const a2 = { allocationVerdict: 'STOP', allocationConfidence: 0.8 } as any;
  const { aiCapitalAllocationSummary } = buildAICapitalAllocationSummaryMetrics([a1, a2]);
  assert.equal(aiCapitalAllocationSummary.increaseCandidates, 1);
  assert.equal(aiCapitalAllocationSummary.stopCandidates, 1);
  assert.equal(aiCapitalAllocationSummary.capitalConfidence, 0.85);
});

test('17. canonical AI capital allocation backfill seeds allocations from existing AI initiatives without fabricating telemetry', async () => {
  const s = makeService({ resolveInitiativeLineage: lineage({ portfolioVerdict: 'MAINTAIN', economicVerdict: 'MAINTAIN' }) });
  const initiativeLookup = { listInitiatives: async () => AI_CAPITAL_ALLOCATION_CANONICAL_NAMES.map((name, idx) => ({ id: `init-${idx}`, name })) };
  const allocations = await backfillCanonicalAICapitalAllocations('t1', s, initiativeLookup);
  assert.equal(allocations.length, AI_CAPITAL_ALLOCATION_CANONICAL_NAMES.length);
  const listed = await s.listAllocations('t1');
  assert.equal(listed.length, AI_CAPITAL_ALLOCATION_CANONICAL_NAMES.length);
});

test('17b. evidence registry target types include AI_CAPITAL_ALLOCATION', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../lib/evidence-registry/evidence-registry-types.ts', import.meta.url), 'utf8');
  assert.match(source, /'AI_CAPITAL_ALLOCATION'/);
});
