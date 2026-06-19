import type { WorkflowValueGraphService } from './workflow-value-graph-service';

/** Minimal shape needed from Decision Authority; kept loose to avoid a hard package dependency. */
export interface BackfillDecisionAuthority {
  listDecisions(tenantId: string, filters?: Record<string, unknown>): Promise<Array<{
    id: string;
    sourceSystem: string;
    sourceReference: string;
    primaryAssetId?: string;
    decisionType: string;
  }>>;
  getDecisionLineage(tenantId: string, decisionId: string): Promise<{
    outcomes: Array<{ outcomeId: string; relationshipType: string }>;
  }>;
}

const isCopilot = (sourceReference: string, decisionType: string) =>
  /copilot/i.test(sourceReference) || decisionType === 'RISK_ACCEPTANCE';

/**
 * Workstream 6: builds the "M365 License Reclamation" and "Copilot Optimisation" workflows
 * purely from already-persisted Decision Authority records for sourceSystem M365 — no new
 * connector work, no new value model.
 */
export async function backfillM365Workflows(
  tenantId: string,
  service: WorkflowValueGraphService,
  decisionAuthority: BackfillDecisionAuthority,
): Promise<{ licenseReclamationWorkflowId: string; copilotOptimisationWorkflowId: string }> {
  const licenseReclamationWorkflow = await service.createOrUpdateWorkflow({
    tenantId,
    name: 'M365 License Reclamation',
    description: 'Reclaims inactive or underutilised M365 licenses via governed recommendation, decision, execution, and outcome.',
    workflowType: 'BUSINESS',
    sourceSystem: 'M365',
    sourceReference: 'license-reclamation',
  });
  const copilotOptimisationWorkflow = await service.createOrUpdateWorkflow({
    tenantId,
    name: 'Copilot Optimisation',
    description: 'Optimises Copilot assignment by connecting Copilot asset usage to governed decisions and outcomes.',
    workflowType: 'AI',
    sourceSystem: 'M365',
    sourceReference: 'copilot-optimisation',
  });

  const decisions = await decisionAuthority.listDecisions(tenantId, { sourceSystem: 'M365' });
  for (const decision of decisions) {
    const workflow = isCopilot(decision.sourceReference, decision.decisionType) ? copilotOptimisationWorkflow : licenseReclamationWorkflow;
    await service.linkWorkflowToDecision(tenantId, workflow.id, decision.id, 'EXECUTES');
    if (decision.primaryAssetId) await service.linkWorkflowToAsset(tenantId, workflow.id, decision.primaryAssetId, 'USES');
    const lineage = await decisionAuthority.getDecisionLineage(tenantId, decision.id);
    for (const outcome of lineage.outcomes) {
      await service.linkWorkflowToOutcome(tenantId, workflow.id, outcome.outcomeId, outcome.relationshipType === 'PROTECTED' ? 'PROTECTS' : 'PRODUCES');
    }
  }

  return { licenseReclamationWorkflowId: licenseReclamationWorkflow.id, copilotOptimisationWorkflowId: copilotOptimisationWorkflow.id };
}
