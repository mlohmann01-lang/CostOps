export type WorkflowType =
  | 'onboarding_remediation'
  | 'ownership_remediation'
  | 'entitlement_remediation'
  | 'pricing_evidence_remediation'
  | 'reconciliation_remediation'
  | 'governance_remediation';

export type WorkflowState = 'queued' | 'in_progress' | 'blocked' | 'escalated' | 'resolved';

export interface WorkflowRun { id: string; type: WorkflowType; state: WorkflowState; assignedOperator?: string; slaDueAt?: string }
export interface WorkflowTransition { runId: string; from: WorkflowState; to: WorkflowState; reason: string; evidenceRef: string }

export function transitionWorkflow(run: WorkflowRun, to: WorkflowState, reason: string): WorkflowTransition {
  return { runId: run.id, from: run.state, to, reason, evidenceRef: `wf:${run.id}:${Date.now()}` };
}
