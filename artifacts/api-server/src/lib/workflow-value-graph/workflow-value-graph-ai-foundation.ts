import type { WorkflowValueGraphService } from './workflow-value-graph-service';

/**
 * Workstream 7: canonical graph support for AI workflow examples. No telemetry, no
 * execution, no orchestration — just first-class Workflow records of type AI.
 */
export const AI_WORKFLOW_FOUNDATION_NAMES = [
  'Knowledge Assistant',
  'Customer Support Agent',
  'Document Processing',
  'Internal Search',
  'AI Development Assistant',
] as const;

export async function seedAIWorkflowFoundation(tenantId: string, service: WorkflowValueGraphService, sourceSystem = 'CERTEN') {
  return Promise.all(AI_WORKFLOW_FOUNDATION_NAMES.map((name) => service.createOrUpdateWorkflow({
    tenantId,
    name,
    workflowType: 'AI',
    sourceSystem,
    sourceReference: name.toLowerCase().replace(/\s+/g, '-'),
  })));
}
