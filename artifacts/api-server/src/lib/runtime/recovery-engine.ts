import { getCheckpoint, upsertCheckpoint } from './runtime-checkpointing';
import { reconcileWorkflows } from './workflow-recovery';

const wfMem = new Map<string, any[]>();
export function setRecoveryWorkflows(tenantId:string, workflows:any[]){ wfMem.set(tenantId, workflows); }

export function getRecoveryState(tenantId:string){
  const checkpoint = getCheckpoint(tenantId);
  const workflows = wfMem.get(tenantId) ?? [];
  const rec = reconcileWorkflows({ workflows });
  return { tenantId, recoveryState: rec.backlog>0 ? 'Recovery reconciliation required' : 'Runtime checkpoint healthy', reconciliationBacklog: rec.backlog, staleWorkflowCount: rec.staleWorkflowCount, recoveryRequiredMarkers: checkpoint?.recoveryRequiredMarkers ?? (rec.backlog>0?['WORKFLOW_RECONCILIATION_REQUIRED']:[]), lastSuccessfulCycles: checkpoint ?? null, runtimeCheckpointStatus: checkpoint ? 'Runtime checkpoint healthy' : 'Workflow reconciliation active' };
}

export function reconcileRecovery(tenantId:string){
  const workflows = wfMem.get(tenantId) ?? [];
  const rec = reconcileWorkflows({ workflows });
  wfMem.set(tenantId, rec.reconciled);
  const now = new Date().toISOString();
  upsertCheckpoint({ tenantId, lastSuccessfulSchedulerRun: now, lastGovernanceEvaluationCycle: now, lastConnectorRefresh: now, lastDriftMonitorCycle: now, recoveryRequiredMarkers: rec.backlog>0 ? ['WORKFLOW_RECONCILIATION_REQUIRED'] : [] });
  return { status: rec.backlog>0 ? 'Workflow reconciliation active' : 'Scheduler recovery complete', reconciledCount: rec.staleWorkflowCount, recoveryState: rec.backlog>0 ? 'Recovery reconciliation required' : 'Scheduler recovery complete' };
}
