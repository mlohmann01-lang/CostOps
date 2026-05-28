import type { ApprovalWorkflow } from './types';

export function canActorApprove(workflow: ApprovalWorkflow, actorId: string, actorRoles: string[]) {
  const stage = workflow.approvalStages[workflow.currentStage];
  const roleMatch = actorRoles.some((r)=>stage.requiredRoles.includes(r));
  if (!roleMatch) return { ok:false, reason:'ROLE_NOT_AUTHORIZED' };
  if (workflow.separationOfDutiesRequired) {
    const priorActors = workflow.approvalStages.flatMap((s)=>s.approvals.map((a)=>a.actorId));
    if (priorActors.includes(actorId)) return { ok:false, reason:'SOD_VIOLATION' };
  }
  return { ok:true };
}
