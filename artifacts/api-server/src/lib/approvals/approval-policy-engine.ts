import type { ApprovalStage } from './types';

export function stagesForRiskClass(riskClass: string): ApprovalStage[] {
  if (riskClass === 'A') return [{ stageId:'stage-1', stageName:'Owner approval', requiredRoles:['OWNER'], timeoutMinutes:240, approvalsRequired:1, approvals:[] }];
  if (riskClass === 'B') return [{ stageId:'stage-1', stageName:'Owner approval', requiredRoles:['OWNER'], timeoutMinutes:240, approvalsRequired:1, approvals:[] },{ stageId:'stage-2', stageName:'Governance approval', requiredRoles:['GOVERNANCE'], timeoutMinutes:240, approvalsRequired:1, approvals:[] }];
  return [{ stageId:'stage-1', stageName:'Owner approval', requiredRoles:['OWNER'], timeoutMinutes:120, approvalsRequired:1, approvals:[] },{ stageId:'stage-2', stageName:'Security/CAB approval', requiredRoles:['SECURITY','CAB'], timeoutMinutes:120, approvalsRequired:1, approvals:[] }];
}
