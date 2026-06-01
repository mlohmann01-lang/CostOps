import test from 'node:test'
import assert from 'node:assert/strict'
import { ApprovalAuthorityError, ApprovalAuthorityService } from '../lib/approvals/approval-authority-service'
import { ExecutionRequestService } from '../lib/execution/execution-request-service'
import { getEntityTimeline, listUnifiedEvents } from '../lib/events/evidence-timeline'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'
import type { GovernedRecommendationObject } from '../lib/recommendations/types'

const rec = (tenantId: string, recommendationId: string, riskClass: 'A' | 'B' = 'A'): GovernedRecommendationObject => ({
  recommendationId,
  tenantId,
  playbookId: 'M365_INACTIVE_LICENSED_USER_RECLAIM',
  targetEntityId: 'user-approval-authority',
  targetEntityType: 'User',
  graphNodeIds: [],
  graphEdgeIds: [],
  discoveryLifecycleState: 'TRUSTED',
  confidenceScore: 0.92,
  reliabilityBand: 'HIGH',
  projectedMonthlySavings: 42,
  projectedAnnualSavings: 504,
  savingsConfidence: 'HIGH',
  actionType: 'REMOVE_LICENSE',
  actionRiskClass: riskClass,
  executionReadiness: 'APPROVAL_REQUIRED',
  readinessReasons: ['Approval required'],
  blockedReasons: [],
  requiredApprovals: ['OWNER'],
  evidencePointers: ['m365:user:user-approval-authority'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendationState: 'APPROVAL_REQUIRED',
})

async function seeded(tenantId: string, recommendationId: string, riskClass: 'A' | 'B' = 'A') {
  const repo = new GovernedRecommendationRepository()
  await repo.upsert(tenantId, rec(tenantId, recommendationId, riskClass), ['src'])
  const events: any[] = []
  const eventService = { emit: async (event: any) => { events.push(event); return event }, list: async () => events } as any
  const authority = new ApprovalAuthorityService(repo, eventService)
  return { repo, authority, events }
}

test('recommendation submit approval goes through approval authority service and workflow is canonical source', async () => {
  const { repo, authority } = await seeded('tenant-a2-submit', 'rec-a2-submit')
  const result = await authority.submitForApproval('tenant-a2-submit', 'RECOMMENDATION', 'rec-a2-submit', { actorId: 'operator', actorRole: 'OWNER' })
  assert.equal(result.approval.sourceSystem, 'APPROVAL_WORKFLOW')
  assert.equal(result.approval.approvalState, 'PENDING')
  const linked: any = await repo.getByRecommendationId('tenant-a2-submit', 'rec-a2-submit')
  assert.equal(linked.approvalWorkflowId, result.approval.workflowId)
  assert.equal(linked.approvalState, 'PENDING_APPROVAL')
  const status = await authority.getApprovalStatus('tenant-a2-submit', 'RECOMMENDATION', 'rec-a2-submit')
  assert.equal(status.workflowId, result.approval.workflowId)
  assert.equal(status.sourceSystem, 'APPROVAL_WORKFLOW')
})

test('duplicate submission is prevented', async () => {
  const { authority } = await seeded('tenant-a2-dupe', 'rec-a2-dupe')
  await authority.submitForApproval('tenant-a2-dupe', 'RECOMMENDATION', 'rec-a2-dupe')
  await assert.rejects(() => authority.submitForApproval('tenant-a2-dupe', 'RECOMMENDATION', 'rec-a2-dupe'), (error: any) => error instanceof ApprovalAuthorityError && error.status === 409)
})

test('canonical approve advances workflow and final approval creates exactly one execution request', async () => {
  const { authority } = await seeded('tenant-a2-approve', 'rec-a2-approve')
  const submitted = await authority.submitForApproval('tenant-a2-approve', 'RECOMMENDATION', 'rec-a2-approve')
  const approved = await authority.approve('tenant-a2-approve', submitted.approval.workflowId, { actorId: 'owner-1', actorRoles: ['OWNER'] })
  assert.equal(approved.approval.approvalState, 'APPROVED')
  assert.equal(approved.executionRequest?.recommendationId, 'rec-a2-approve')
  const approvedAgain = await authority.approve('tenant-a2-approve', submitted.approval.workflowId, { actorId: 'owner-1', actorRoles: ['OWNER'] })
  assert.equal(approvedAgain.executionRequest?.requestId, undefined)
  const requests = await new ExecutionRequestService().list('tenant-a2-approve')
  assert.equal(requests.filter((row: any) => row.recommendationId === 'rec-a2-approve').length, 1)
})

test('legacy approval request cannot independently create execution request', async () => {
  const request = await new ExecutionRequestService().createFromApprovedWorkflow({ workflowId: 'legacy-wf', tenantId: 'tenant-a2-legacy', targetType: 'RECOMMENDATION', targetId: 'rec-a2-legacy', workflowName: 'legacy', approvalStages: [], currentStage: 0, requiredRoles: [], approverAssignments: {}, approvalState: 'APPROVED', escalationPolicy: { escalateAfterMinutes: 1, escalateToRoles: [] }, delegatedApprovalAllowed: false, separationOfDutiesRequired: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), approvalExpiryAt: new Date(Date.now() + 1000).toISOString(), auditEvents: [] }, 'legacy', 'LEGACY_APPROVAL_REQUEST')
  assert.equal(request, null)
})

test('events emitted once per transition', async () => {
  const { authority } = await seeded('tenant-a2-events', 'rec-a2-events')
  const submitted = await authority.submitForApproval('tenant-a2-events', 'RECOMMENDATION', 'rec-a2-events')
  await authority.approve('tenant-a2-events', submitted.approval.workflowId, { actorId: 'owner-1', actorRoles: ['OWNER'] })
  const workflowEvents = getEntityTimeline('tenant-a2-events', 'APPROVAL_WORKFLOW', submitted.approval.workflowId)
  assert.equal(workflowEvents.filter((event) => event.eventType === 'APPROVAL_SUBMITTED').length, 1)
  assert.equal(workflowEvents.filter((event) => event.eventType === 'APPROVAL_APPROVED').length, 1)
})

test('tenant isolation and no dry-run/execution/connector mutation', async () => {
  const { authority } = await seeded('tenant-a2-isolated', 'rec-a2-isolated')
  const submitted = await authority.submitForApproval('tenant-a2-isolated', 'RECOMMENDATION', 'rec-a2-isolated')
  const otherStatus = await authority.getApprovalStatus('tenant-a2-other', 'RECOMMENDATION', 'rec-a2-isolated')
  assert.equal(otherStatus.approvalState, 'NOT_SUBMITTED')
  const approved = await authority.approve('tenant-a2-isolated', submitted.approval.workflowId, { actorId: 'owner-1', actorRoles: ['OWNER'] })
  assert.equal((approved.executionRequest as any)?.dryRunId, undefined)
  assert.equal((approved.executionRequest as any)?.executedAt, undefined)
  assert.equal(listUnifiedEvents('tenant-a2-isolated').some((event) => String(event.eventType).includes('CONNECTOR')), false)
})
