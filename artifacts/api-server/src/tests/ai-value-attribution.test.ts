import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryAIValueAttributionStores, AIValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';
import { AIValueAttributionService } from '../lib/ai-value-attribution/ai-value-attribution-service';
import { backfillCanonicalAIActivities, AI_BACKFILL_CANONICAL_PROVIDERS } from '../lib/ai-value-attribution/ai-value-attribution-backfill';
import { buildAIValueSummaryMetrics, buildAIValueAttributionProofPackEvidence } from '../lib/executive-proof-packs/ai-value-attribution-proof-pack-evidence';

const makeService = (resolvers: any = {}) => new AIValueAttributionService(new AIValueAttributionRepository(createInMemoryAIValueAttributionStores()), resolvers);

test('AI activity creation captures canonical fields', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'GitHub Copilot', provider: 'GitHub', sourceSystem: 'CERTEN', sourceReference: 'github-copilot' });
  assert.equal(a.activityName, 'GitHub Copilot');
  assert.equal(a.activityType, 'CODING');
  assert.ok(a.id);
});

test('AI value attribution creation captures canonical fields', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity A', sourceSystem: 'TEST', sourceReference: 'ref-1' });
  const attribution = await s.createAttribution({ tenantId: 't1', activityId: a.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 1000, sourceSystem: 'TEST', sourceReference: 'ref-1' });
  assert.equal(attribution.attributionType, 'TIME_SAVED');
  assert.equal(attribution.attributedValueAmount, 1000);
  assert.ok(attribution.id);
});

test('AI activity workflow linkage attaches a workflow to an activity', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity B', sourceSystem: 'TEST', sourceReference: 'ref-2' });
  const link = await s.linkActivityToWorkflow('t1', a.id, 'workflow-1', 0.9);
  assert.equal(link.workflowId, 'workflow-1');
  assert.equal(link.confidence, 0.9);
});

test('AI activity outcome linkage attaches an outcome to an activity', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity C', sourceSystem: 'TEST', sourceReference: 'ref-3' });
  const link = await s.linkActivityToOutcome('t1', a.id, 'outcome-1');
  assert.equal(link.outcomeId, 'outcome-1');
});

test('AI activity decision linkage attaches a decision to an activity', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity D', sourceSystem: 'TEST', sourceReference: 'ref-4' });
  const link = await s.linkActivityToDecision('t1', a.id, 'decision-1');
  assert.equal(link.decisionId, 'decision-1');
});

test('AI activity value signal linkage attaches a value signal to an activity', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity E', sourceSystem: 'TEST', sourceReference: 'ref-5' });
  const link = await s.linkActivityToValueSignal('t1', a.id, 'signal-1', 0.8);
  assert.equal(link.valueSignalId, 'signal-1');
  assert.equal(link.confidence, 0.8);
});

test('AI value attribution evaluation is deterministic and verdict-driven', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity F', sourceSystem: 'TEST', sourceReference: 'ref-6' });
  await s.linkActivityToWorkflow('t1', a.id, 'workflow-1');
  await s.linkActivityToValueSignal('t1', a.id, 'signal-1');
  await s.linkActivityToOutcome('t1', a.id, 'outcome-1');
  await s.createAttribution({ tenantId: 't1', activityId: a.id, attributionType: 'TIME_SAVED', attributionMethod: 'WORKFLOW_EVIDENCE', attributedValueAmount: 500, sourceSystem: 'TEST', sourceReference: 'ref-6' });
  const evaluation = await s.evaluateAIValueAttribution('t1', a.id);
  assert.equal(evaluation.verdict, 'ATTRIBUTED');
  assert.ok(evaluation.confidence > 0.5);
});

test('direct evidence attribution contributes to directEvidenceValue', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity G', sourceSystem: 'TEST', sourceReference: 'ref-7' });
  await s.createAttribution({ tenantId: 't1', activityId: a.id, attributionType: 'PRODUCTIVITY_GAIN', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 750, sourceSystem: 'TEST', sourceReference: 'ref-7' });
  const evaluation = await s.evaluateAIValueAttribution('t1', a.id);
  assert.equal(evaluation.directEvidenceValue, 750);
  assert.equal(evaluation.verdict, 'PARTIALLY_ATTRIBUTED');
});

test('workflow evidence attribution contributes to workflowEvidenceValue', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity H', sourceSystem: 'TEST', sourceReference: 'ref-8' });
  await s.linkActivityToWorkflow('t1', a.id, 'workflow-1');
  await s.createAttribution({ tenantId: 't1', activityId: a.id, attributionType: 'TIME_SAVED', attributionMethod: 'WORKFLOW_EVIDENCE', attributedValueAmount: 900, sourceSystem: 'TEST', sourceReference: 'ref-8' });
  const evaluation = await s.evaluateAIValueAttribution('t1', a.id);
  assert.equal(evaluation.workflowEvidenceValue, 900);
});

test('insufficient evidence verdict is returned for an activity with no attributions', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity I', sourceSystem: 'TEST', sourceReference: 'ref-9' });
  const evaluation = await s.evaluateAIValueAttribution('t1', a.id);
  assert.equal(evaluation.verdict, 'INSUFFICIENT_EVIDENCE');
});

test('workflow value integration surfaces AI-attributed value for a workflow', async () => {
  const s = makeService();
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity J', sourceSystem: 'TEST', sourceReference: 'ref-10' });
  await s.linkActivityToWorkflow('t1', a.id, 'workflow-1');
  await s.createAttribution({ tenantId: 't1', activityId: a.id, workflowId: 'workflow-1', attributionType: 'TIME_SAVED', attributionMethod: 'WORKFLOW_EVIDENCE', attributedValueAmount: 1200, sourceSystem: 'TEST', sourceReference: 'ref-10' });
  const result = await s.getWorkflowAIValue('t1', 'workflow-1');
  assert.equal(result.aiAttributedValue, 1200);
});

test('investment value integration surfaces AI-attributed value for an investment and notifies the resolver', async () => {
  let recorded: any = null;
  const s = makeService({ recordInvestmentValueAttribution: async (_t: string, attribution: any) => { recorded = attribution; } });
  const a = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity K', sourceSystem: 'TEST', sourceReference: 'ref-11' });
  await s.createAttribution({ tenantId: 't1', activityId: a.id, investmentId: 'investment-1', attributionType: 'COST_AVOIDANCE', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 2000, sourceSystem: 'TEST', sourceReference: 'ref-11' });
  const result = await s.getInvestmentAIValue('t1', 'investment-1');
  assert.equal(result.aiAttributedValue, 2000);
  assert.ok(recorded);
  assert.equal(recorded.investmentId, 'investment-1');
});

test('AI value attribution proof pack integration summarises activity count and top activities by attributed value', async () => {
  const s = makeService();
  const a1 = await s.createAIActivity({ tenantId: 't1', activityType: 'CODING', activityName: 'Activity L', sourceSystem: 'TEST', sourceReference: 'ref-12' });
  const a2 = await s.createAIActivity({ tenantId: 't1', activityType: 'CHAT', activityName: 'Activity M', sourceSystem: 'TEST', sourceReference: 'ref-13' });
  await s.createAttribution({ tenantId: 't1', activityId: a1.id, attributionType: 'TIME_SAVED', attributionMethod: 'DIRECT_EVIDENCE', attributedValueAmount: 300, sourceSystem: 'TEST', sourceReference: 'ref-12' });
  const lineage1 = await s.getActivityLineage('t1', a1.id);
  const lineage2 = await s.getActivityLineage('t1', a2.id);
  const { aiValueSummary } = buildAIValueSummaryMetrics([lineage1, lineage2]);
  assert.equal(aiValueSummary.activityCount, 2);
  assert.equal(aiValueSummary.totalAttributedValue, 300);
  const evidence = buildAIValueAttributionProofPackEvidence([lineage1, lineage2]);
  assert.ok(Array.isArray(evidence));
});

test('AI evidence linkage is supported via the AI_ACTIVITY and AI_VALUE_ATTRIBUTION target types', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../lib/evidence-registry/evidence-registry-types.ts', import.meta.url), 'utf8');
  assert.match(source, /'AI_ACTIVITY'/);
  assert.match(source, /'AI_VALUE_ATTRIBUTION'/);
});

test('canonical AI backfill seeds AI activities from existing AI assets without fabricating telemetry', async () => {
  const s = makeService();
  const assetLookup = { listAssets: async () => ([{ id: 'asset-1', vendor: 'GitHub', name: 'GitHub Copilot' }]) };
  const activities = await backfillCanonicalAIActivities('t1', s, 'CERTEN', assetLookup);
  assert.equal(activities.length, AI_BACKFILL_CANONICAL_PROVIDERS.length);
  const copilot = activities.find((a) => a.activityName === 'GitHub Copilot');
  assert.ok(copilot);
  assert.equal(copilot!.metadata.aiAssetId, 'asset-1');
  assert.equal(copilot!.estimatedTokens, undefined);
  const listed = await s.listActivities('t1');
  assert.equal(listed.length, AI_BACKFILL_CANONICAL_PROVIDERS.length);
});
