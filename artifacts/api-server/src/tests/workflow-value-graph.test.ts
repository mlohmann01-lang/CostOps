import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryWorkflowValueGraphStores, WorkflowValueGraphRepository } from '../lib/workflow-value-graph/workflow-value-graph-repository';
import { WorkflowValueGraphService } from '../lib/workflow-value-graph/workflow-value-graph-service';
import { backfillM365Workflows } from '../lib/workflow-value-graph/workflow-value-graph-m365-backfill';
import { AI_WORKFLOW_FOUNDATION_NAMES, seedAIWorkflowFoundation } from '../lib/workflow-value-graph/workflow-value-graph-ai-foundation';
import { buildWorkflowSummaryMetrics, buildWorkflowProofPackEvidence } from '../lib/executive-proof-packs/workflow-proof-pack-evidence';

const makeService = (resolvers: any = {}) => new WorkflowValueGraphService(new WorkflowValueGraphRepository(createInMemoryWorkflowValueGraphStores()), resolvers);

test('workflow creation captures canonical fields', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'M365 License Reclamation', workflowType: 'BUSINESS', sourceSystem: 'M365', sourceReference: 'license-reclamation' });
  assert.equal(w.name, 'M365 License Reclamation');
  assert.equal(w.normalizedName, 'm365-license-reclamation');
  assert.equal(w.status, 'ACTIVE');
  assert.ok(w.id);
});

test('workflow asset linkage attaches an asset to a workflow', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow A', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-1' });
  const link = await s.linkWorkflowToAsset('t1', w.id, 'asset-1', 'USES');
  assert.equal(link.assetId, 'asset-1');
  assert.equal(link.relationshipType, 'USES');
});

test('workflow principal linkage attaches a principal to a workflow', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow B', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-2' });
  const link = await s.linkWorkflowToPrincipal('t1', w.id, 'user-1', 'OWNER');
  assert.equal(link.principalId, 'user-1');
  assert.equal(link.relationshipType, 'OWNER');
});

test('workflow decision linkage attaches a decision to a workflow', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow C', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-3' });
  const link = await s.linkWorkflowToDecision('t1', w.id, 'decision-1', 'EXECUTES');
  assert.equal(link.decisionId, 'decision-1');
});

test('workflow outcome linkage attaches an outcome to a workflow', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow D', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-4' });
  const link = await s.linkWorkflowToOutcome('t1', w.id, 'outcome-1', 'PRODUCES');
  assert.equal(link.outcomeId, 'outcome-1');
});

test('workflow investment linkage attaches an investment to a workflow', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow E', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-5' });
  const link = await s.linkWorkflowToInvestment('t1', w.id, 'investment-1', 'FUNDS');
  assert.equal(link.investmentId, 'investment-1');
});

test('workflow value signal linkage attaches a value signal to a workflow', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow F', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-6' });
  const link = await s.linkWorkflowToValueSignal('t1', w.id, 'signal-1', 0.9);
  assert.equal(link.valueSignalId, 'signal-1');
  assert.equal(link.confidence, 0.9);
});

test('workflow graph generation reconstructs all linked records', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow G', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-7' });
  await s.linkWorkflowToAsset('t1', w.id, 'asset-1', 'USES');
  await s.linkWorkflowToPrincipal('t1', w.id, 'user-1', 'OWNER');
  await s.linkWorkflowToDecision('t1', w.id, 'decision-1', 'EXECUTES');
  await s.linkWorkflowToOutcome('t1', w.id, 'outcome-1', 'PRODUCES');
  await s.linkWorkflowToInvestment('t1', w.id, 'investment-1', 'FUNDS');
  await s.linkWorkflowToValueSignal('t1', w.id, 'signal-1', 0.9);
  const graph = await s.getWorkflowGraph('t1', w.id);
  assert.equal(graph.workflow.id, w.id);
  assert.equal(graph.assets.length, 1);
  assert.equal(graph.principals.length, 1);
  assert.equal(graph.decisions.length, 1);
  assert.equal(graph.outcomes.length, 1);
  assert.equal(graph.investments.length, 1);
  assert.equal(graph.valueSignals.length, 1);
});

test('workflow lineage generation includes graph plus evaluation', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow H', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-8' });
  await s.linkWorkflowToOutcome('t1', w.id, 'outcome-1', 'PRODUCES');
  const lineage = await s.getWorkflowLineage('t1', w.id);
  assert.equal(lineage.workflow.id, w.id);
  assert.equal(lineage.evaluation.workflowId, w.id);
});

test('workflow evaluation is deterministic and verdict-driven', async () => {
  const resolvers = {
    resolveValueSignal: async () => ({ targetValue: 1000, verifiedValue: 1000, confidence: 0.9 }),
    resolveDecision: async () => ({ outcomeValueSummary: { protectedValue: 500 } }),
  };
  const s = makeService(resolvers);
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow I', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-9' });
  await s.linkWorkflowToValueSignal('t1', w.id, 'signal-1', 0.9);
  await s.linkWorkflowToDecision('t1', w.id, 'decision-1', 'EXECUTES');
  const evaluation = await s.evaluateWorkflow('t1', w.id);
  assert.equal(evaluation.verdict, 'VALUE_PRODUCING');
  assert.equal(evaluation.verifiedValue, 1000);
  assert.equal(evaluation.protectedValue, 500);
  assert.ok(evaluation.confidence > 0.5);

  const emptyService = makeService();
  const emptyWorkflow = await emptyService.createWorkflow({ tenantId: 't1', name: 'Workflow J', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-10' });
  const insufficient = await emptyService.evaluateWorkflow('t1', emptyWorkflow.id);
  assert.equal(insufficient.verdict, 'INSUFFICIENT_EVIDENCE');
});

test('M365 workflow backfill connects existing decisions to License Reclamation and Copilot Optimisation workflows', async () => {
  const s = makeService();
  const decisionAuthority = {
    listDecisions: async () => ([
      { id: 'decision-license', sourceSystem: 'M365', sourceReference: 'license-1', primaryAssetId: 'asset-license', decisionType: 'MANUAL_DECISION' },
      { id: 'decision-copilot', sourceSystem: 'M365', sourceReference: 'copilot-seat-1', primaryAssetId: 'asset-copilot', decisionType: 'MANUAL_DECISION' },
    ]),
    getDecisionLineage: async (tenantId: string, decisionId: string) => ({
      outcomes: decisionId === 'decision-license' ? [{ outcomeId: 'outcome-license', relationshipType: 'PROTECTED' }] : [],
    }),
  };
  const { licenseReclamationWorkflowId, copilotOptimisationWorkflowId } = await backfillM365Workflows('t1', s, decisionAuthority);
  const licenseGraph = await s.getWorkflowGraph('t1', licenseReclamationWorkflowId);
  const copilotGraph = await s.getWorkflowGraph('t1', copilotOptimisationWorkflowId);
  assert.equal(licenseGraph.decisions.length, 1);
  assert.equal(licenseGraph.decisions[0].decisionId, 'decision-license');
  assert.equal(licenseGraph.outcomes.length, 1);
  assert.equal(copilotGraph.decisions.length, 1);
  assert.equal(copilotGraph.decisions[0].decisionId, 'decision-copilot');
});

test('decision workflow context surfaces workflows linked to a decision', async () => {
  const s = makeService();
  const w = await s.createWorkflow({ tenantId: 't1', name: 'Workflow K', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-11' });
  await s.linkWorkflowToDecision('t1', w.id, 'decision-1', 'EXECUTES');
  const workflows = await s.getWorkflowsForDecision('t1', 'decision-1');
  assert.equal(workflows.length, 1);
  assert.equal(workflows[0].id, w.id);
});

test('workflow proof pack integration summarises workflow count and top workflows by protected value', async () => {
  const s = makeService();
  const resolvers = {} as any;
  const w1 = await s.createWorkflow({ tenantId: 't1', name: 'Workflow L', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-12' });
  const w2 = await s.createWorkflow({ tenantId: 't1', name: 'Workflow M', workflowType: 'BUSINESS', sourceSystem: 'TEST', sourceReference: 'ref-13' });
  const lineage1 = await s.getWorkflowLineage('t1', w1.id);
  const lineage2 = await s.getWorkflowLineage('t1', w2.id);
  const { workflowSummary } = buildWorkflowSummaryMetrics([lineage1, lineage2]);
  assert.equal(workflowSummary.workflowCount, 2);
  assert.equal(workflowSummary.topWorkflows.length, 2);
  const evidence = buildWorkflowProofPackEvidence([lineage1, lineage2]);
  assert.ok(Array.isArray(evidence));
  void resolvers;
});

test('workflow evidence linkage is supported via the WORKFLOW target type', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(new URL('../lib/evidence-registry/evidence-registry-types.ts', import.meta.url), 'utf8');
  assert.match(source, /'WORKFLOW'/);
});

test('AI workflow foundation seeds canonical AI-type workflow records', async () => {
  const s = makeService();
  const workflows = await seedAIWorkflowFoundation('t1', s);
  assert.equal(workflows.length, AI_WORKFLOW_FOUNDATION_NAMES.length);
  for (const w of workflows) {
    assert.equal(w.workflowType, 'AI');
  }
  const listed = await s.listWorkflows('t1');
  assert.equal(listed.length, AI_WORKFLOW_FOUNDATION_NAMES.length);
});
