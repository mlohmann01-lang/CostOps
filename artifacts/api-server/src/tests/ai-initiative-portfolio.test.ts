import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryAIInitiativePortfolioStores, AIInitiativePortfolioRepository } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-repository';
import { AIInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';
import { backfillCanonicalAIInitiatives, AI_INITIATIVE_CANONICAL_PORTFOLIO } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-backfill';
import { buildAIInitiativePortfolioSummaryMetrics, buildAIInitiativePortfolioProofPackEvidence } from '../lib/executive-proof-packs/ai-initiative-portfolio-proof-pack-evidence';

const makeService = (resolvers: any = {}) => new AIInitiativePortfolioService(new AIInitiativePortfolioRepository(createInMemoryAIInitiativePortfolioStores()), resolvers);

test('1. AI initiative creation captures canonical fields', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'GitHub Copilot Adoption', initiativeType: 'DEVELOPER_PRODUCTIVITY', sourceSystem: 'TEST', sourceReference: 'ref-1' });
  assert.equal(i.name, 'GitHub Copilot Adoption');
  assert.equal(i.initiativeType, 'DEVELOPER_PRODUCTIVITY');
  assert.equal(i.status, 'PROPOSED');
  assert.ok(i.id);
});

test('2. investment linkage attaches an investment to an initiative', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative A', sourceSystem: 'TEST', sourceReference: 'ref-2' });
  const link = await s.linkInvestment('t1', i.id, 'investment-1', 0.9);
  assert.equal(link.investmentId, 'investment-1');
  assert.equal(link.confidence, 0.9);
});

test('3. workflow linkage attaches a workflow to an initiative', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative B', sourceSystem: 'TEST', sourceReference: 'ref-3' });
  const link = await s.linkWorkflow('t1', i.id, 'workflow-1', 0.8);
  assert.equal(link.workflowId, 'workflow-1');
  assert.equal(link.confidence, 0.8);
});

test('4. attribution linkage attaches an attribution to an initiative', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative C', sourceSystem: 'TEST', sourceReference: 'ref-4' });
  const link = await s.linkAttribution('t1', i.id, 'attribution-1', 0.7);
  assert.equal(link.attributionId, 'attribution-1');
  assert.equal(link.confidence, 0.7);
});

test('5. economics linkage attaches an economic profile to an initiative', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative D', sourceSystem: 'TEST', sourceReference: 'ref-5' });
  const link = await s.linkEconomics('t1', i.id, 'profile-1', 0.6);
  assert.equal(link.economicProfileId, 'profile-1');
  assert.equal(link.confidence, 0.6);
});

test('6. outcome linkage attaches a protected outcome to an initiative', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative E', sourceSystem: 'TEST', sourceReference: 'ref-6' });
  const link = await s.linkOutcome('t1', i.id, 'outcome-1', 0.5);
  assert.equal(link.outcomeId, 'outcome-1');
  assert.equal(link.confidence, 0.5);
});

test('7. portfolio evaluation aggregates spend, value, and ratio from linked economics', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 1500, verifiedValue: 1200, protectedValue: 900, verdict: 'EXPAND', confidence: 0.8 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative F', sourceSystem: 'TEST', sourceReference: 'ref-7' });
  await s.linkEconomics('t1', i.id, 'profile-1');
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.totalSpend, 500);
  assert.equal(evaluation.attributedValue, 1500);
  assert.equal(evaluation.valueToCostRatio, 3);
});

test('8. SCALE verdict requires high ratio, protected value, high confidence, and an EXPAND economic verdict', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 2000, verifiedValue: 1800, protectedValue: 1000, verdict: 'EXPAND', confidence: 0.9 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative G', sourceSystem: 'TEST', sourceReference: 'ref-8' });
  await s.linkEconomics('t1', i.id, 'profile-1', 0.9);
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.portfolioVerdict, 'SCALE');
});

test('9. MAINTAIN verdict applies when value is positive but economics are not strong enough to scale', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 1000, verifiedValue: 800, protectedValue: 0, verdict: 'MAINTAIN', confidence: 0.8 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative H', sourceSystem: 'TEST', sourceReference: 'ref-9' });
  await s.linkEconomics('t1', i.id, 'profile-1', 0.8);
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.portfolioVerdict, 'MAINTAIN');
});

test('10. OPTIMISE verdict applies when value exists but efficiency is weak', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 100, verifiedValue: 80, protectedValue: 0, verdict: 'OPTIMISE', confidence: 0.8 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative I', sourceSystem: 'TEST', sourceReference: 'ref-10' });
  await s.linkEconomics('t1', i.id, 'profile-1', 0.8);
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.portfolioVerdict, 'OPTIMISE');
});

test('11. REVIEW verdict applies when evidence and confidence are weak', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 1000, verifiedValue: 800, protectedValue: 0, verdict: 'MAINTAIN', confidence: 0.1 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative J', sourceSystem: 'TEST', sourceReference: 'ref-11' });
  await s.linkEconomics('t1', i.id, 'profile-1', 0.1);
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.portfolioVerdict, 'REVIEW');
});

test('12. RETIRE verdict applies when cost exists but attributed value is absent', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 0, verifiedValue: 0, protectedValue: 0, verdict: 'RETIRE', confidence: 0.8 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative K', sourceSystem: 'TEST', sourceReference: 'ref-12' });
  await s.linkEconomics('t1', i.id, 'profile-1', 0.8);
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.portfolioVerdict, 'RETIRE');
});

test('13. EXPERIMENT verdict applies when an initiative has no linked history', async () => {
  const s = makeService();
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative L', sourceSystem: 'TEST', sourceReference: 'ref-13' });
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.portfolioVerdict, 'EXPERIMENT');
});

test('14. proof pack integration summarises initiative count, verdict candidates, and portfolio value/spend', async () => {
  const s = makeService({ resolveEconomics: async () => ({ totalSpend: 500, totalAttributedValue: 2000, verifiedValue: 1800, protectedValue: 1000, verdict: 'EXPAND', confidence: 0.9 }) });
  const i1 = await s.createInitiative({ tenantId: 't1', name: 'Initiative M', sourceSystem: 'TEST', sourceReference: 'ref-14a' });
  await s.linkEconomics('t1', i1.id, 'profile-1', 0.9);
  const i2 = await s.createInitiative({ tenantId: 't1', name: 'Initiative N', sourceSystem: 'TEST', sourceReference: 'ref-14b' });
  const lineage1 = await s.getInitiativeLineage('t1', i1.id);
  const lineage2 = await s.getInitiativeLineage('t1', i2.id);
  const { aiInitiativePortfolioSummary } = buildAIInitiativePortfolioSummaryMetrics([lineage1, lineage2]);
  assert.equal(aiInitiativePortfolioSummary.initiativeCount, 2);
  assert.equal(aiInitiativePortfolioSummary.scaleCandidates, 1);
  assert.equal(aiInitiativePortfolioSummary.experimentCandidates, 1);
  assert.equal(aiInitiativePortfolioSummary.portfolioValue, 2000);
  assert.equal(aiInitiativePortfolioSummary.portfolioSpend, 500);
  const evidence = buildAIInitiativePortfolioProofPackEvidence([lineage1, lineage2]);
  assert.ok(Array.isArray(evidence));
});

test('15. AI Economics integration resolves economics outputs without recreating them', async () => {
  let calledWith: any = null;
  const s = makeService({ resolveEconomics: async (_t: string, economicProfileId: string) => { calledWith = economicProfileId; return { totalSpend: 400, totalAttributedValue: 1600, verifiedValue: 1500, protectedValue: 800, verdict: 'EXPAND', confidence: 0.85 }; } });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative O', sourceSystem: 'TEST', sourceReference: 'ref-15' });
  await s.linkEconomics('t1', i.id, 'economics-resolved');
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(calledWith, 'economics-resolved');
  assert.equal(evaluation.attributedValue, 1600);
  assert.equal(evaluation.economicVerdict, 'EXPAND');
});

test('16. AI Value Attribution integration resolves attribution value when economics are absent', async () => {
  const s = makeService({ resolveAttribution: async () => ({ attributedValueAmount: 900, attributionConfidence: 0.75 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative P', sourceSystem: 'TEST', sourceReference: 'ref-16' });
  await s.linkAttribution('t1', i.id, 'attribution-1');
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.attributedValue, 900);
});

test('17. Workflow Value Graph integration aggregates workflow value when economics and attribution are absent', async () => {
  const s = makeService({ resolveWorkflowValue: async () => ({ aiAttributedValue: 700 }) });
  const i = await s.createInitiative({ tenantId: 't1', name: 'Initiative Q', sourceSystem: 'TEST', sourceReference: 'ref-17' });
  await s.linkWorkflow('t1', i.id, 'workflow-1');
  const evaluation = await s.evaluateInitiative('t1', i.id);
  assert.equal(evaluation.attributedValue, 700);
});

test('18. canonical AI initiative backfill seeds initiatives from existing AI economic profiles without fabricating telemetry', async () => {
  const s = makeService();
  const economicProfileLookup = { listEconomicProfiles: async () => ([{ id: 'profile-1', profileName: 'GitHub Copilot' }]) };
  const initiatives = await backfillCanonicalAIInitiatives('t1', s, economicProfileLookup);
  assert.equal(initiatives.length, AI_INITIATIVE_CANONICAL_PORTFOLIO.length);
  const copilot = initiatives.find((i) => i.name === 'GitHub Copilot Adoption');
  assert.ok(copilot);
  assert.equal((copilot!.metadata as any).aiEconomicProfileId, 'profile-1');
  const listed = await s.listInitiatives('t1');
  assert.equal(listed.length, AI_INITIATIVE_CANONICAL_PORTFOLIO.length);
});

test('18b. evidence registry target types include AI_INITIATIVE and AI_PORTFOLIO_EVALUATION', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../lib/evidence-registry/evidence-registry-types.ts', import.meta.url), 'utf8');
  assert.match(source, /'AI_INITIATIVE'/);
  assert.match(source, /'AI_PORTFOLIO_EVALUATION'/);
});
