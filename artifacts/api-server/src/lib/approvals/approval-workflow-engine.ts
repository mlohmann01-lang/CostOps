import { randomUUID } from 'crypto';
import type { ApprovalWorkflow, WorkflowTargetType } from './types';
import { stagesForRiskClass } from './approval-policy-engine';
import { canActorApprove } from './approval-routing';

export function createWorkflow(input:{tenantId:string; targetType:WorkflowTargetType; targetId:string; workflowName:string; riskClass:string; delegatedApprovalAllowed?:boolean; separationOfDutiesRequired?:boolean; escalationAfterMinutes?:number;}) : ApprovalWorkflow {
  const now = new Date();
  const stages = stagesForRiskClass(input.riskClass);
  return { workflowId:`wf_${randomUUID()}`, tenantId:input.tenantId, targetType:input.targetType, targetId:input.targetId, workflowName:input.workflowName, approvalStages:stages, currentStage:0, requiredRoles:Array.from(new Set(stages.flatMap((s)=>s.requiredRoles))), approverAssignments:{}, approvalState:'PENDING_APPROVAL', escalationPolicy:{escalateAfterMinutes:input.escalationAfterMinutes ?? 240, escalateToRoles:['GOVERNANCE','SECURITY']}, delegatedApprovalAllowed:input.delegatedApprovalAllowed ?? false, separationOfDutiesRequired:input.separationOfDutiesRequired ?? true, createdAt:now.toISOString(), updatedAt:now.toISOString(), approvalExpiryAt:new Date(now.getTime()+24*3600000).toISOString(), auditEvents:[{eventType:'APPROVAL_STAGE_ENTERED', at:now.toISOString(), detail:'Stage 1 entered'}] };
}

export function approveWorkflow(workflow: ApprovalWorkflow, actorId:string, actorRoles:string[]): ApprovalWorkflow {
  const now = new Date().toISOString();
  if (workflow.approvalState === 'APPROVED' || workflow.approvalState === 'REJECTED' || workflow.approvalState === 'EXPIRED') return workflow;
  if (new Date(workflow.approvalExpiryAt).getTime() < Date.now()) return { ...workflow, approvalState:'EXPIRED', updatedAt:now, auditEvents:[...workflow.auditEvents,{eventType:'APPROVAL_EXPIRED', actorId, at:now}] };
  const chk = canActorApprove(workflow, actorId, actorRoles); if (!chk.ok) return workflow;
  const stage = workflow.approvalStages[workflow.currentStage];
  stage.approvals.push({ actorId, role: actorRoles.find((r)=>stage.requiredRoles.includes(r)) ?? actorRoles[0] ?? 'UNKNOWN', approvedAt: now });
  const events = [...workflow.auditEvents, { eventType:'APPROVAL_GRANTED' as const, actorId, at:now, detail: stage.stageId }];
  if (stage.approvals.length >= stage.approvalsRequired) {
    if (workflow.currentStage >= workflow.approvalStages.length - 1) return { ...workflow, approvalState:'APPROVED', updatedAt:now, approvalStages:[...workflow.approvalStages], auditEvents:events };
    return { ...workflow, currentStage: workflow.currentStage + 1, approvalState:'PARTIALLY_APPROVED', updatedAt:now, approvalStages:[...workflow.approvalStages], auditEvents:[...events,{eventType:'APPROVAL_STAGE_ENTERED',at:now,detail:`Stage ${workflow.currentStage+2} entered`}] };
  }
  return { ...workflow, approvalState:'PARTIALLY_APPROVED', updatedAt:now, approvalStages:[...workflow.approvalStages], auditEvents:events };
}

export function rejectWorkflow(workflow: ApprovalWorkflow, actorId:string, reason:string): ApprovalWorkflow { const now=new Date().toISOString(); return { ...workflow, approvalState:'REJECTED', updatedAt:now, auditEvents:[...workflow.auditEvents,{eventType:'APPROVAL_REJECTED',actorId,at:now,detail:reason}] }; }
export function delegateWorkflow(workflow: ApprovalWorkflow, actorId:string, delegateTo:string, role:string): ApprovalWorkflow { const now=new Date().toISOString(); if(!workflow.delegatedApprovalAllowed) return workflow; const key=workflow.approvalStages[workflow.currentStage].stageId; return { ...workflow, approverAssignments:{...workflow.approverAssignments,[key]:Array.from(new Set([...(workflow.approverAssignments[key]??[]),delegateTo]))}, updatedAt:now, auditEvents:[...workflow.auditEvents,{eventType:'APPROVAL_DELEGATED',actorId,at:now,detail:`${delegateTo}:${role}`}]}; }
export function evaluateEscalation(workflow: ApprovalWorkflow, now = new Date()): ApprovalWorkflow { const stageStart = new Date(workflow.auditEvents.filter((e)=>e.eventType==='APPROVAL_STAGE_ENTERED').slice(-1)[0]?.at ?? workflow.createdAt).getTime(); if (now.getTime()-stageStart > workflow.escalationPolicy.escalateAfterMinutes*60000 && workflow.approvalState==='PENDING_APPROVAL') { const ts=now.toISOString(); return { ...workflow, approvalState:'ESCALATED', updatedAt:ts, auditEvents:[...workflow.auditEvents,{eventType:'APPROVAL_ESCALATED',at:ts,detail:'Escalated due to timeout'}]}; } return workflow; }
