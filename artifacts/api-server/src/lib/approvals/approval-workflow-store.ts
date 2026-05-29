import { evaluateEscalation } from './approval-workflow-engine'
import type { ApprovalWorkflow } from './types'

const mem = new Map<string, ApprovalWorkflow[]>()
const key = (tenantId: string) => tenantId

export function saveApprovalWorkflow(workflow: ApprovalWorkflow) {
  const rows = mem.get(key(workflow.tenantId)) ?? []
  const index = rows.findIndex((row) => row.workflowId === workflow.workflowId)
  const next = index >= 0 ? rows.map((row, i) => i === index ? workflow : row) : [...rows, workflow]
  mem.set(key(workflow.tenantId), next)
  return workflow
}

export function listApprovalWorkflows(tenantId: string) {
  const rows = (mem.get(key(tenantId)) ?? []).map((workflow) => evaluateEscalation(workflow))
  mem.set(key(tenantId), rows)
  return rows
}

export function getApprovalWorkflow(tenantId: string, workflowId: string) {
  return listApprovalWorkflows(tenantId).find((workflow) => workflow.workflowId === workflowId) ?? null
}

export function findActiveApprovalWorkflow(tenantId: string, targetType: string, targetId: string) {
  return listApprovalWorkflows(tenantId).find((workflow) => workflow.targetType === targetType && workflow.targetId === targetId && !['APPROVED','REJECTED','EXPIRED','CANCELLED'].includes(workflow.approvalState)) ?? null
}

export function updateApprovalWorkflow(tenantId: string, workflowId: string, updater: (workflow: ApprovalWorkflow) => ApprovalWorkflow) {
  const workflow = getApprovalWorkflow(tenantId, workflowId)
  if (!workflow) return null
  return saveApprovalWorkflow(updater(workflow))
}
