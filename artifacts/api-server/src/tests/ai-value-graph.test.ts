import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';
import { aiValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';
import { economicOutcomeAttributionService } from '../lib/economic-outcomes/economic-outcome-attribution';
import { buildAIValueGraph } from '../lib/ai-value-graph/ai-value-graph-builder';
import { aiValueGraphService } from '../lib/ai-value-graph/ai-value-graph-service';
import { getAIValueGraphAuthority } from '../lib/ai-value-graph/ai-value-graph-authority';

function seedAttribution(tenantId: string, assetId: string, opts: { withEvidence?: boolean } = {}) {
  const now = new Date().toISOString();
  const attribution = {
    id: randomUUID(), tenantId, assetId, attributionType: 'PRODUCTIVITY_GAIN' as const,
    attributionMethod: 'DIRECT_EVIDENCE' as const, attributedValueAmount: 1000, sourceSystem: 'TEST',
    sourceReference: 'ref', createdAt: now, updatedAt: now, metadata: {}, confidenceScore: 80,
  };
  aiValueAttributionRepository.upsertAttribution(attribution as any);
  if (opts.withEvidence !== false) {
    aiValueAttributionRepository.upsertEvidence({
      id: randomUUID(), tenantId, attributionId: attribution.id, evidenceType: 'BUSINESS_METRIC',
      evidenceStrength: 'VERIFIED', source: 'TEST', timestamp: now, createdAt: now,
    } as any);
  }
  aiValueAttributionRepository.upsertContributor({
    id: randomUUID(), tenantId, attributionId: attribution.id, contributorType: 'ASSET', contributorId: assetId, weight: 100, createdAt: now,
  } as any);
  return attribution;
}

async function seedFullInitiative(tenantId: string, assetId: string) {
  const initiative = await aiInitiativePortfolioService.createInitiative({
    tenantId, name: 'Support Copilot', sourceSystem: 'TEST', sourceReference: randomUUID(),
    ownerName: 'Jane Doe', department: 'Support',
  });
  await aiInitiativePortfolioService.linkAsset(tenantId, initiative.id, assetId);
  const outcome = economicOutcomeAttributionService.createEconomicOutcome({
    tenantId, assetId, assetType: 'AI_ASSET', name: 'Faster resolution',
  });
  await aiInitiativePortfolioService.linkOutcome(tenantId, initiative.id, outcome.id);
  const attribution = seedAttribution(tenantId, assetId);
  await aiInitiativePortfolioService.linkAttribution(tenantId, initiative.id, attribution.id);
  const objective = economicOutcomeAttributionService.createBusinessObjective({
    tenantId, name: 'Reduce support cost', linkedAssetIds: [assetId],
  });
  await aiInitiativePortfolioService.linkObjective(tenantId, initiative.id, objective.id);
  return { initiative, outcome, attribution, objective, assetId };
}

// ─── Graph Model Tests ──────────────────────────────────────────────────────

test('AI3.1 model: deterministic node/edge creation for the same entity', async () => {
  const t = `t-ai3-1-${randomUUID()}`;
  const { initiative } = await seedFullInitiative(t, 'asset-1');
  const acc1 = await buildAIValueGraph(t);
  const acc2 = await buildAIValueGraph(t);
  assert.ok(acc1.nodes.has(`initiative:${initiative.id}`));
  assert.deepEqual([...acc1.nodes.keys()].sort(), [...acc2.nodes.keys()].sort());
});

// ─── No-Fabrication Tests ───────────────────────────────────────────────────

test('AI3.2 no-fabrication: an initiative with no asset link produces an ASSET_LINKAGE gap, no SUPPORTS edge', async () => {
  const t = `t-ai3-2-${randomUUID()}`;
  await aiInitiativePortfolioService.createInitiative({ tenantId: t, name: 'Unlinked', sourceSystem: 'TEST', sourceReference: randomUUID() });
  const acc = await buildAIValueGraph(t);
  assert.ok(acc.gaps.some((g) => g.area === 'ASSET_LINKAGE'));
  assert.ok(![...acc.edges.values()].some((e) => e.type === 'SUPPORTS'));
});

test('AI3.3 no-fabrication: an objective is only linked to assets known to the AI value chain', async () => {
  const t = `t-ai3-3-${randomUUID()}`;
  economicOutcomeAttributionService.createBusinessObjective({ tenantId: t, name: 'Orphan objective', linkedAssetIds: ['unknown-asset'] });
  const acc = await buildAIValueGraph(t);
  assert.ok(![...acc.edges.values()].some((e) => e.type === 'LINKED_TO' && e.to.includes('objective')));
});

// ─── Initiative Graph Tests ─────────────────────────────────────────────────

test('AI3.4 initiative graph: returns owner, asset, outcome, objective chain', async () => {
  const t = `t-ai3-4-${randomUUID()}`;
  const { initiative } = await seedFullInitiative(t, 'asset-4');
  const result = await aiValueGraphService.getInitiativeValuePath(t, initiative.id);
  assert.equal(result.found, true);
  assert.ok(result.nodes.some((n) => n.type === 'OWNER'));
  assert.ok(result.nodes.some((n) => n.type === 'AI_ASSET'));
  assert.ok(result.nodes.some((n) => n.type === 'OUTCOME'));
  assert.ok(result.nodes.some((n) => n.type === 'OBJECTIVE'));
});

// ─── Asset Graph Tests ──────────────────────────────────────────────────────

test('AI3.5 asset graph: answers why an asset exists with initiative + outcome context', async () => {
  const t = `t-ai3-5-${randomUUID()}`;
  await seedFullInitiative(t, 'asset-5');
  const result = await aiValueGraphService.getWhyAssetExists(t, 'asset-5');
  assert.equal(result.found, true);
  assert.match(result.explanation, /initiative/);
});

test('AI3.6 asset graph: unknown asset is reported honestly, not fabricated', async () => {
  const t = `t-ai3-6-${randomUUID()}`;
  const result = await aiValueGraphService.getWhyAssetExists(t, 'never-existed');
  assert.equal(result.found, false);
});

// ─── Objective Graph Tests ──────────────────────────────────────────────────

test('AI3.7 objective graph: shows supporting initiatives', async () => {
  const t = `t-ai3-7-${randomUUID()}`;
  const { objective } = await seedFullInitiative(t, 'asset-7');
  const result = await aiValueGraphService.getObjectiveSupportPath(t, objective.id);
  assert.equal(result.found, true);
  assert.ok(result.nodes.some((n) => n.type === 'INITIATIVE'));
});

// ─── Gap Tests ───────────────────────────────────────────────────────────────

test('AI3.8 gaps: missing owner creates an OWNERSHIP gap', async () => {
  const t = `t-ai3-8-${randomUUID()}`;
  const initiative = await aiInitiativePortfolioService.createInitiative({ tenantId: t, name: 'No owner', sourceSystem: 'TEST', sourceReference: randomUUID() });
  const acc = await buildAIValueGraph(t);
  assert.ok(acc.gaps.some((g) => g.area === 'OWNERSHIP' && g.affectedNodeIds.includes(`initiative:${initiative.id}`)));
});

test('AI3.9 gaps: attribution with no evidence creates an EVIDENCE_LINKAGE gap', async () => {
  const t = `t-ai3-9-${randomUUID()}`;
  const initiative = await aiInitiativePortfolioService.createInitiative({ tenantId: t, name: 'Evidence test', sourceSystem: 'TEST', sourceReference: randomUUID(), ownerName: 'Owner' });
  const attribution = seedAttribution(t, 'asset-9', { withEvidence: false });
  await aiInitiativePortfolioService.linkAttribution(t, initiative.id, attribution.id);
  const acc = await buildAIValueGraph(t);
  assert.ok(acc.gaps.some((g) => g.area === 'EVIDENCE_LINKAGE'));
});

test('AI3.10 gaps: objective with no supporting initiative is surfaced', async () => {
  const t = `t-ai3-10-${randomUUID()}`;
  economicOutcomeAttributionService.createBusinessObjective({ tenantId: t, name: 'Unsupported objective' });
  const acc = await buildAIValueGraph(t);
  assert.ok(acc.gaps.some((g) => g.area === 'OBJECTIVE_LINKAGE'));
});

// ─── Completeness Tests ─────────────────────────────────────────────────────

test('AI3.11 completeness: zero initiatives is NOT_READY with score 0', async () => {
  const t = `t-ai3-11-${randomUUID()}`;
  const graph = await aiValueGraphService.getGraph(t);
  assert.equal(graph.readiness, 'NOT_READY');
  assert.equal(graph.completenessScore, 0);
});

test('AI3.12 completeness: a fully-linked initiative scores higher than an empty one', async () => {
  const t = `t-ai3-12-${randomUUID()}`;
  await seedFullInitiative(t, 'asset-12');
  const graph = await aiValueGraphService.getGraph(t);
  assert.ok(graph.completenessScore > 0);
  assert.ok(['READY', 'PARTIAL'].includes(graph.readiness));
});

// ─── Authority Tests ─────────────────────────────────────────────────────────

test('AI3.13 authority: zero initiatives reports NOT_READY honestly', async () => {
  const t = `t-ai3-13-${randomUUID()}`;
  const result = await getAIValueGraphAuthority(t);
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.score, 0);
  assert.equal(result.authority, 'AI_VALUE_GRAPH_AUTHORITY');
});

test('AI3.14 authority: a fully-linked initiative improves the verdict and reports real counts', async () => {
  const t = `t-ai3-14-${randomUUID()}`;
  await seedFullInitiative(t, 'asset-14');
  const result = await getAIValueGraphAuthority(t);
  assert.equal(result.initiatives.total, 1);
  assert.equal(result.initiatives.withOwners, 1);
  assert.ok(result.score > 0);
});

// ─── Tenant Isolation ────────────────────────────────────────────────────────

test('AI3.15 tenant isolation: graphs never mix data across tenants', async () => {
  const tA = `t-ai3-15a-${randomUUID()}`;
  const tB = `t-ai3-15b-${randomUUID()}`;
  await seedFullInitiative(tA, 'asset-15a');
  const graphB = await aiValueGraphService.getGraph(tB);
  assert.equal(graphB.nodes.length, 0);
  assert.equal(graphB.gaps.length, 0);
});
