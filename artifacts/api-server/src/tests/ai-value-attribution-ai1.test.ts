// Program AI1 — Outcome Attribution Completion tests.
// Confidence, Multi-Source, Evidence, Lineage, Readiness, Decision.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryAIValueAttributionStores, AIValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';
import { AIValueAttributionService } from '../lib/ai-value-attribution/ai-value-attribution-service';
import { computeAttributionConfidence, confidenceLevelFromScore } from '../lib/ai-value-attribution/attribution-confidence-engine';
import { recommendAttributionAction } from '../lib/ai-value-attribution/attribution-decision-engine';
import { getOutcomeAttributionReadiness } from '../lib/ai-value-attribution/outcome-attribution-readiness-authority';
import { aiValueAttributionService } from '../lib/ai-value-attribution/ai-value-attribution-service';

const makeService = (resolvers: any = {}) => {
  const repo = new AIValueAttributionRepository(createInMemoryAIValueAttributionStores());
  return { repo, service: new AIValueAttributionService(repo, resolvers) };
};

// ─── Confidence ─────────────────────────────────────────────────────────────

test('[confidence] no evidence yields LOW confidence with explicit reasoning, never fabricated', () => {
  const result = computeAttributionConfidence({ evidenceStrengths: [], distinctSourceCount: 0 });
  assert.equal(result.level, 'LOW');
  assert.match(result.reasoning, /no evidence items attached/);
});

test('[confidence] single strong source cannot alone reach VERIFIED (correlation != causation)', () => {
  const result = computeAttributionConfidence({ evidenceStrengths: ['VERIFIED'], distinctSourceCount: 1, signalStable: true, timeCorrelationHours: 0 });
  assert.notEqual(result.level, 'VERIFIED');
});

test('[confidence] corroborated verified evidence across multiple sources reaches VERIFIED', () => {
  const result = computeAttributionConfidence({ evidenceStrengths: ['VERIFIED', 'VERIFIED', 'VERIFIED'], distinctSourceCount: 5, signalStable: true, timeCorrelationHours: 0 });
  assert.equal(result.level, 'VERIFIED');
  assert.ok(result.score >= 90);
});

test('[confidence] confidenceLevelFromScore boundaries match spec ranges', () => {
  assert.equal(confidenceLevelFromScore(0), 'LOW');
  assert.equal(confidenceLevelFromScore(39), 'LOW');
  assert.equal(confidenceLevelFromScore(40), 'MODERATE');
  assert.equal(confidenceLevelFromScore(69), 'MODERATE');
  assert.equal(confidenceLevelFromScore(70), 'HIGH');
  assert.equal(confidenceLevelFromScore(89), 'HIGH');
  assert.equal(confidenceLevelFromScore(90), 'VERIFIED');
});

test('[confidence] recomputeConfidence persists score/level/reasoning onto the attribution record', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  await service.addEvidence('t1', attribution.id, { evidenceType: 'AI_USAGE', evidenceStrength: 'OBSERVED', source: 'copilot', timestamp: new Date().toISOString() });
  const updated = await service.recomputeConfidence('t1', attribution.id, true, 1);
  assert.ok(updated.confidenceScore !== undefined);
  assert.ok(updated.confidenceLevel);
  assert.ok(updated.confidenceReasoning);
  const reloaded = await service.getAttributionById('t1', attribution.id);
  assert.equal(reloaded!.confidenceScore, updated.confidenceScore);
});

// ─── Multi-Source Attribution ──────────────────────────────────────────────

test('[multi-source] contributor weights must sum to exactly 100', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  await assert.rejects(() => service.setContributors('t1', attribution.id, [
    { contributorType: 'ASSET', contributorId: 'asset-1', weight: 60 },
    { contributorType: 'HUMAN', contributorId: 'human-1', weight: 30 },
  ]));
});

test('[multi-source] valid contributor set totaling 100 is persisted and listable', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  const contributors = await service.setContributors('t1', attribution.id, [
    { contributorType: 'ASSET', contributorId: 'asset-1', weight: 70 },
    { contributorType: 'HUMAN', contributorId: 'human-1', weight: 30 },
  ]);
  assert.equal(contributors.length, 2);
  assert.equal(contributors.reduce((s, c) => s + c.weight, 0), 100);
  const listed = await service.listContributors('t1', attribution.id);
  assert.equal(listed.length, 2);
});

test('[multi-source] replacing a contributor set zeroes the old set rather than accumulating', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  await service.setContributors('t1', attribution.id, [{ contributorType: 'ASSET', contributorId: 'asset-1', weight: 100 }]);
  await service.setContributors('t1', attribution.id, [{ contributorType: 'AGENT', contributorId: 'agent-1', weight: 100 }]);
  const listed = await service.listContributors('t1', attribution.id);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].contributorType, 'AGENT');
});

// ─── Evidence Registry ──────────────────────────────────────────────────────

test('[evidence] addEvidence persists type/strength/source/timestamp and is listable', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  const evidence = await service.addEvidence('t1', attribution.id, { evidenceType: 'HUMAN_CONFIRMATION', evidenceStrength: 'VERIFIED', source: 'manager-review', timestamp: '2026-01-01T00:00:00.000Z', description: 'confirmed by manager' });
  assert.equal(evidence.evidenceType, 'HUMAN_CONFIRMATION');
  const listed = await service.listEvidence('t1', attribution.id);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, evidence.id);
});

test('[evidence] addEvidence rejects an unknown attribution id (no fabricated evidence)', async () => {
  const { service } = makeService();
  await assert.rejects(() => service.addEvidence('t1', 'does-not-exist', { evidenceType: 'SYSTEM_EVENT', evidenceStrength: 'INFERRED', source: 'x', timestamp: new Date().toISOString() }));
});

// ─── Lineage ─────────────────────────────────────────────────────────────────

test('[lineage] resolves activity, evidence, contributors and is incomplete without evidence/contributors', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  const lineage = await service.getAttributionLineage('t1', attribution.id);
  assert.equal(lineage.activity!.id, activity.id);
  assert.equal(lineage.complete, false);
});

test('[lineage] becomes complete once evidence and contributors are attached', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  await service.addEvidence('t1', attribution.id, { evidenceType: 'AI_USAGE', evidenceStrength: 'OBSERVED', source: 'copilot', timestamp: new Date().toISOString() });
  await service.setContributors('t1', attribution.id, [{ contributorType: 'ASSET', contributorId: 'asset-1', weight: 100 }]);
  const lineage = await service.getAttributionLineage('t1', attribution.id);
  assert.equal(lineage.complete, true);
});

test('[lineage] objectiveIds resolves only via the assetId resolver, never fabricated, and is empty when no resolver matches', async () => {
  const { service } = makeService({ listBusinessObjectivesForAsset: async (_t: string, assetId: string) => (assetId === 'asset-1' ? ['objective-1'] : []) });
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, assetId: 'asset-1', attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  const lineage = await service.getAttributionLineage('t1', attribution.id);
  assert.deepEqual(lineage.objectiveIds, ['objective-1']);

  const attributionNoAsset = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  const lineageNoAsset = await service.getAttributionLineage('t1', attributionNoAsset.id);
  assert.deepEqual(lineageNoAsset.objectiveIds, []);
});

// ─── Decision Framework ──────────────────────────────────────────────────────

test('[decision] no evidence yields INSUFFICIENT_EVIDENCE', () => {
  const rec = recommendAttributionAction({ attributionId: 'a1', confidenceLevel: 'HIGH', confidenceScore: 80, evidence: [], contributors: [] });
  assert.equal(rec.verdict, 'INSUFFICIENT_EVIDENCE');
});

test('[decision] LOW confidence with no contributors yields RETIRE', () => {
  const rec = recommendAttributionAction({ attributionId: 'a1', confidenceLevel: 'LOW', confidenceScore: 20, evidence: [{ id: 'e1', tenantId: 't1', attributionId: 'a1', evidenceType: 'AI_USAGE', evidenceStrength: 'ESTIMATED', source: 'x', timestamp: '2026-01-01', createdAt: '2026-01-01' }], contributors: [] });
  assert.equal(rec.verdict, 'RETIRE');
});

test('[decision] LOW confidence with contributors yields REVIEW', () => {
  const rec = recommendAttributionAction({
    attributionId: 'a1', confidenceLevel: 'LOW', confidenceScore: 20,
    evidence: [{ id: 'e1', tenantId: 't1', attributionId: 'a1', evidenceType: 'AI_USAGE', evidenceStrength: 'ESTIMATED', source: 'x', timestamp: '2026-01-01', createdAt: '2026-01-01' }],
    contributors: [{ id: 'c1', tenantId: 't1', attributionId: 'a1', contributorType: 'ASSET', contributorId: 'asset-1', weight: 100, createdAt: '2026-01-01' }],
  });
  assert.equal(rec.verdict, 'REVIEW');
});

test('[decision] volatile signal forces REVIEW regardless of high confidence', () => {
  const rec = recommendAttributionAction({
    attributionId: 'a1', confidenceLevel: 'HIGH', confidenceScore: 80, signalStable: false,
    evidence: [{ id: 'e1', tenantId: 't1', attributionId: 'a1', evidenceType: 'AI_USAGE', evidenceStrength: 'OBSERVED', source: 'x', timestamp: '2026-01-01', createdAt: '2026-01-01' }],
    contributors: [],
  });
  assert.equal(rec.verdict, 'REVIEW');
});

test('[decision] VERIFIED confidence with diverse contributors yields EXPAND', () => {
  const rec = recommendAttributionAction({
    attributionId: 'a1', confidenceLevel: 'VERIFIED', confidenceScore: 95,
    evidence: [{ id: 'e1', tenantId: 't1', attributionId: 'a1', evidenceType: 'AI_USAGE', evidenceStrength: 'VERIFIED', source: 'x', timestamp: '2026-01-01', createdAt: '2026-01-01' }],
    contributors: [
      { id: 'c1', tenantId: 't1', attributionId: 'a1', contributorType: 'ASSET', contributorId: 'asset-1', weight: 50, createdAt: '2026-01-01' },
      { id: 'c2', tenantId: 't1', attributionId: 'a1', contributorType: 'HUMAN', contributorId: 'human-1', weight: 50, createdAt: '2026-01-01' },
    ],
  });
  assert.equal(rec.verdict, 'EXPAND');
});

test('[decision] VERIFIED confidence with low diversity yields KEEP, not RETIRE', () => {
  const rec = recommendAttributionAction({
    attributionId: 'a1', confidenceLevel: 'VERIFIED', confidenceScore: 95,
    evidence: [{ id: 'e1', tenantId: 't1', attributionId: 'a1', evidenceType: 'AI_USAGE', evidenceStrength: 'VERIFIED', source: 'x', timestamp: '2026-01-01', createdAt: '2026-01-01' }],
    contributors: [{ id: 'c1', tenantId: 't1', attributionId: 'a1', contributorType: 'ASSET', contributorId: 'asset-1', weight: 100, createdAt: '2026-01-01' }],
  });
  assert.equal(rec.verdict, 'KEEP');
});

test('[decision] MODERATE confidence without human confirmation yields REVIEW', () => {
  const rec = recommendAttributionAction({
    attributionId: 'a1', confidenceLevel: 'MODERATE', confidenceScore: 50,
    evidence: [{ id: 'e1', tenantId: 't1', attributionId: 'a1', evidenceType: 'AI_USAGE', evidenceStrength: 'INFERRED', source: 'x', timestamp: '2026-01-01', createdAt: '2026-01-01' }],
    contributors: [],
  });
  assert.equal(rec.verdict, 'REVIEW');
});

test('[decision] recommendAttributionAction on the service uses the attribution\'s persisted confidence', async () => {
  const { service } = makeService();
  const activity = await service.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'A', sourceSystem: 'TEST', sourceReference: 'r1' });
  const attribution = await service.createAttribution({ tenantId: 't1', activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: 'r1' });
  const rec = await service.recommendAttributionAction('t1', attribution.id);
  assert.equal(rec.verdict, 'INSUFFICIENT_EVIDENCE');
});

// ─── Readiness Authority ─────────────────────────────────────────────────────

test('[readiness] tenant with zero attributions is honestly reported NOT_READY, never fabricated', async () => {
  const result = await getOutcomeAttributionReadiness('tenant-with-nothing-ai1-readiness');
  assert.equal(result.verdict, 'NOT_READY');
  assert.equal(result.coverage.attributionCount, 0);
});

test('[readiness] well-evidenced, corroborated, complete-lineage attributions push verdict toward READY', async () => {
  // Uses the default singleton service/repository, since the readiness authority
  // reads from the module-level shared repository rather than an injected one.
  const tenantId = 'tenant-ai1-readiness-ready';
  for (let i = 0; i < 3; i += 1) {
    const activity = await aiValueAttributionService.createAIActivity({ tenantId, activityType: 'CODING', activityName: `A${i}`, sourceSystem: 'TEST', sourceReference: `r${i}` });
    const attribution = await aiValueAttributionService.createAttribution({ tenantId, activityId: activity.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 100, sourceSystem: 'TEST', sourceReference: `r${i}` });
    await aiValueAttributionService.addEvidence(tenantId, attribution.id, { evidenceType: 'AI_USAGE', evidenceStrength: 'VERIFIED', source: 'copilot', timestamp: new Date().toISOString() });
    await aiValueAttributionService.addEvidence(tenantId, attribution.id, { evidenceType: 'HUMAN_CONFIRMATION', evidenceStrength: 'VERIFIED', source: 'manager', timestamp: new Date().toISOString() });
    await aiValueAttributionService.setContributors(tenantId, attribution.id, [{ contributorType: 'ASSET', contributorId: 'asset-1', weight: 100 }]);
    await aiValueAttributionService.recomputeConfidence(tenantId, attribution.id, true, 1);
  }
  const readiness = await getOutcomeAttributionReadiness(tenantId);
  assert.equal(readiness.coverage.attributionCount, 3);
  assert.equal(readiness.coverage.attributionsWithEvidence, 3);
  assert.ok(readiness.score > 0);
  assert.notEqual(readiness.verdict, 'NOT_READY');
});

test('[readiness] tenant isolation: readiness for one tenant is unaffected by another tenant\'s attributions', async () => {
  const a = await getOutcomeAttributionReadiness('tenant-ai1-iso-a');
  const b = await getOutcomeAttributionReadiness('tenant-ai1-iso-b');
  assert.equal(a.tenantId, 'tenant-ai1-iso-a');
  assert.equal(b.tenantId, 'tenant-ai1-iso-b');
});
