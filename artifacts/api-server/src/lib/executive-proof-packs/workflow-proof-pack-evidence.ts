import type { WorkflowLineage } from '../workflow-value-graph/workflow-value-graph-types';

export interface WorkflowSummaryEntry {
  workflowId: string;
  workflowName: string;
  workflowType: string;
  verifiedValue: number;
  protectedValue: number;
  confidence: number;
  verdict: string;
}

/** Workstream 11: "Workflow Summary" section reusing workflow count, verified value, protected value, top workflows — no new proof pack type. */
export function buildWorkflowSummaryMetrics(lineages: WorkflowLineage[]): {
  workflowSummary: { workflowCount: number; totalVerifiedValue: number; totalProtectedValue: number; topWorkflows: WorkflowSummaryEntry[] };
} {
  const entries: WorkflowSummaryEntry[] = lineages.map((lineage) => ({
    workflowId: lineage.workflow.id,
    workflowName: lineage.workflow.name,
    workflowType: lineage.workflow.workflowType,
    verifiedValue: lineage.evaluation.verifiedValue,
    protectedValue: lineage.evaluation.protectedValue,
    confidence: lineage.evaluation.confidence,
    verdict: lineage.evaluation.verdict,
  }));
  const topWorkflows = [...entries].sort((a, b) => b.protectedValue - a.protectedValue).slice(0, 5);
  return {
    workflowSummary: {
      workflowCount: lineages.length,
      totalVerifiedValue: entries.reduce((sum, e) => sum + e.verifiedValue, 0),
      totalProtectedValue: entries.reduce((sum, e) => sum + e.protectedValue, 0),
      topWorkflows,
    },
  };
}

export function buildWorkflowProofPackEvidence(lineages: WorkflowLineage[]) {
  return lineages.flatMap((lineage) => lineage.valueSignals.map((signal) => ({
    evidenceRef: signal.valueSignalId,
    targetId: lineage.workflow.id,
    trustLevel: (signal.confidence ?? 0) >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
    integrityStatus: 'PASS' as const,
    redactionStatus: 'NOT_REQUIRED' as const,
  })));
}
