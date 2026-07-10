import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryAIEconomicsStores, AIEconomicsRepository } from '../lib/ai-economics/ai-economics-repository';
import { AIEconomicsAuthorityService } from '../lib/ai-economics/ai-economics-service';
import { backfillCanonicalAIEconomicProfiles, AI_ECONOMICS_CANONICAL_PROFILES } from '../lib/ai-economics/ai-economics-backfill';
import { buildAIEconomicsSummaryMetrics, buildAIEconomicsProofPackEvidence } from '../lib/executive-proof-packs/ai-economics-proof-pack-evidence';

const makeService = (resolvers: any = {}) => new AIEconomicsAuthorityService(new AIEconomicsRepository(createInMemoryAIEconomicsStores()), resolvers);

test('1. AI economic profile creation captures canonical fields', async () => {
  const s = makeService();
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'GitHub Copilot', totalSpend: 1000, totalAttributedValue: 4000 });
  assert.equal(p.profileName, 'GitHub Copilot');
  assert.equal(p.totalSpend, 1000);
  assert.ok(p.id);
});

test('2. AI cost signal creation captures canonical fields', async () => {
  const s = makeService();
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-1' });
  assert.equal(c.costType, 'SUBSCRIPTION');
  assert.equal(c.amount, 500);
  assert.ok(c.id);
});

test('3. attribution linkage attaches an attribution to a profile', async () => {
  const s = makeService();
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile A' });
  const link = await s.linkAttribution('t1', p.id, 'attribution-1', 0.9);
  assert.equal(link.attributionId, 'attribution-1');
  assert.equal(link.confidence, 0.9);
});

test('4. workflow linkage attaches a workflow to a profile', async () => {
  const s = makeService();
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile B' });
  const link = await s.linkWorkflow('t1', p.id, 'workflow-1', 0.8);
  assert.equal(link.workflowId, 'workflow-1');
  assert.equal(link.confidence, 0.8);
});

test('5. investment linkage attaches an investment to a profile', async () => {
  const s = makeService();
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile C' });
  const link = await s.linkInvestment('t1', p.id, 'investment-1', 0.7);
  assert.equal(link.investmentId, 'investment-1');
  assert.equal(link.confidence, 0.7);
});

test('6. spend calculation sums linked cost signals', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 1000, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile D', totalSpend: 999 });
  const c1 = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 300, sourceSystem: 'TEST', sourceReference: 'ref-2' });
  const c2 = await s.createCostSignal({ tenantId: 't1', costType: 'TOKEN_USAGE', amount: 200, sourceSystem: 'TEST', sourceReference: 'ref-3' });
  await s.linkCostSignal('t1', p.id, c1.id);
  await s.linkCostSignal('t1', p.id, c2.id);
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.totalSpend, 500);
});

test('7. value calculation resolves attributed value from linked attributions', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 1500, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile E', totalSpend: 500, totalAttributedValue: 999 });
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.totalAttributedValue, 1500);
});

test('8. ratio calculation divides attributed value by spend', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 1500, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile F', totalSpend: 500 });
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-4' });
  await s.linkCostSignal('t1', p.id, c.id);
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.valueToCostRatio, 3);
});

test('9. EXPAND verdict requires high ratio, protected value, and high confidence', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 3000, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile G', totalSpend: 500, protectedValue: 1000, economicConfidence: 0.9 });
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-5' });
  await s.linkCostSignal('t1', p.id, c.id);
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.verdict, 'EXPAND');
});

test('10. MAINTAIN verdict applies when ratio is positive but not strong enough to expand', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 1000, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile H', totalSpend: 500, economicConfidence: 0.9 });
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-6' });
  await s.linkCostSignal('t1', p.id, c.id);
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.verdict, 'MAINTAIN');
});

test('11. OPTIMISE verdict applies when value exists but efficiency is weak', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 100, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile I', totalSpend: 500, economicConfidence: 0.9 });
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-7' });
  await s.linkCostSignal('t1', p.id, c.id);
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.verdict, 'OPTIMISE');
});

test('12. RETIRE verdict applies when cost exists but value is absent', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 0, attributionConfidence: 0.9 }) });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile J', totalSpend: 500 });
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-8' });
  await s.linkCostSignal('t1', p.id, c.id);
  await s.linkAttribution('t1', p.id, 'attribution-1');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.verdict, 'RETIRE');
});

test('12b. INSUFFICIENT_DATA verdict applies when spend or attribution is missing', async () => {
  const s = makeService();
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile K' });
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(evaluation.verdict, 'INSUFFICIENT_DATA');
});

test('13. proof pack integration summarises profile count and top profiles by attributed value', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 1000, attributionConfidence: 0.9 }) });
  const p1 = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile L', totalSpend: 500 });
  const p2 = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile M' });
  const c = await s.createCostSignal({ tenantId: 't1', costType: 'SUBSCRIPTION', amount: 500, sourceSystem: 'TEST', sourceReference: 'ref-9', confidence: 0.9 });
  await s.linkCostSignal('t1', p1.id, c.id);
  await s.linkAttribution('t1', p1.id, 'attribution-1');
  const lineage1 = await s.getProfileLineage('t1', p1.id);
  const lineage2 = await s.getProfileLineage('t1', p2.id);
  const { aiEconomicsSummary } = buildAIEconomicsSummaryMetrics([lineage1, lineage2]);
  assert.equal(aiEconomicsSummary.profileCount, 2);
  assert.equal(aiEconomicsSummary.totalAttributedValue, 1000);
  const evidence = buildAIEconomicsProofPackEvidence([lineage1, lineage2]);
  assert.ok(Array.isArray(evidence));
});

test('14. AI attribution integration resolves attribution outputs without duplicating value calculations', async () => {
  let calledWith: any = null;
  const s = makeService({ resolveAttribution: async (_t: string, attributionId: string) => { calledWith = attributionId; return { attributedValueAmount: 2200, attributionConfidence: 0.95 }; } });
  const p = await s.createEconomicProfile({ tenantId: 't1', profileName: 'Profile N', totalSpend: 500 });
  await s.linkAttribution('t1', p.id, 'attribution-resolved');
  const evaluation = await s.evaluateEconomics('t1', p.id);
  assert.equal(calledWith, 'attribution-resolved');
  assert.equal(evaluation.totalAttributedValue, 2200);
});

test('15. workflow integration surfaces economics for a workflow and notifies the value realisation resolver', async () => {
  let recorded: any = null;
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 1800, attributionConfidence: 0.9 }), recordEconomicEfficiency: async (_t: string, evaluation: any) => { recorded = evaluation; } });
  const p = await s.createEconomicProfile({ tenantId: 't1', workflowId: 'workflow-1', profileName: 'Profile O', totalSpend: 600 });
  await s.linkAttribution('t1', p.id, 'attribution-1');
  await s.evaluateEconomics('t1', p.id);
  const result = await s.getWorkflowEconomics('t1', 'workflow-1');
  assert.equal(result.profileCount, 1);
  assert.equal(result.totalAttributedValue, 1800);
  assert.ok(recorded);
  assert.equal(recorded.economicProfileId, p.id);
});

test('16. AI evidence linkage is supported via the AI_ECONOMIC_PROFILE and AI_COST_SIGNAL target types', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../lib/evidence-registry/evidence-registry-types.ts', import.meta.url), 'utf8');
  assert.match(source, /'AI_ECONOMIC_PROFILE'/);
  assert.match(source, /'AI_COST_SIGNAL'/);
});

test('17. canonical AI economics backfill seeds profiles from existing AI investments without fabricating telemetry', async () => {
  const s = makeService();
  const investmentLookup = { listInvestments: async () => ([{ id: 'investment-1', name: 'GitHub Copilot' }]) };
  const profiles = await backfillCanonicalAIEconomicProfiles('t1', s, investmentLookup);
  assert.equal(profiles.length, AI_ECONOMICS_CANONICAL_PROFILES.length);
  const copilot = profiles.find((p) => p.profileName === 'GitHub Copilot');
  assert.ok(copilot);
  assert.equal(copilot!.investmentId, 'investment-1');
  assert.equal(copilot!.totalSpend, 0);
  const listed = await s.listEconomicProfiles('t1');
  assert.equal(listed.length, AI_ECONOMICS_CANONICAL_PROFILES.length);
});
