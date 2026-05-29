import test from 'node:test'
import assert from 'node:assert/strict'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'
import { RecommendationApprovalError, RecommendationApprovalService } from '../lib/recommendations/recommendation-approval-service'
import { getEntityTimeline } from '../lib/events/evidence-timeline'
import type { GovernedRecommendationObject } from '../lib/recommendations/types'

const rec = (tenantId: string, recommendationId: string, overrides: Partial<GovernedRecommendationObject> = {}): GovernedRecommendationObject => ({
  recommendationId,
  tenantId,
  playbookId: 'M365_RIGHTSIZE_LICENSE_V1',
  targetEntityId: 'user-1',
  targetEntityType: 'User',
  graphNodeIds: [],
  graphEdgeIds: [],
  discoveryLifecycleState: 'TRUSTED',
  confidenceScore: 0.9,
  reliabilityBand: 'HIGH',
  projectedMonthlySavings: 21,
  projectedAnnualSavings: 252,
  savingsConfidence: 'HIGH',
  actionType: 'RIGHTSIZE_LICENSE',
  actionRiskClass: 'B',
  executionReadiness: 'APPROVAL_REQUIRED',
  readinessReasons: ['Approval required for live mutation'],
  blockedReasons: [],
  requiredApprovals: ['OWNER'],
  evidencePointers: ['m365:user:user-1'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendationState: 'APPROVAL_REQUIRED',
  ...overrides,
})

async function serviceWith(recommendation: GovernedRecommendationObject) {
  const repo = new GovernedRecommendationRepository()
  await repo.upsert(recommendation.tenantId, recommendation, recommendation.evidencePointers)
  const events: any[] = []
  const svc = new RecommendationApprovalService(repo, { emit: async (event: any) => { events.push(event); return event }, list: async () => events } as any)
  return { repo, svc, events }
}

test('approval workflow created from approval-required recommendation', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-create', 'rec-create'))
  const out = await svc.submitForApproval({ tenantId: 'tenant-approval-create', recommendationId: 'rec-create' })
  assert.equal(out.recommendationId, 'rec-create')
  assert.match(out.workflowId, /^wf_/)
  assert.equal(out.approvalState, 'PENDING_APPROVAL')
  assert.ok(out.requiredRoles.length > 0)
})

test('recommendation linked to workflow', async () => {
  const { repo, svc } = await serviceWith(rec('tenant-approval-link', 'rec-link'))
  const out = await svc.submitForApproval({ tenantId: 'tenant-approval-link', recommendationId: 'rec-link' })
  const linked: any = await repo.getByRecommendationId('tenant-approval-link', 'rec-link')
  assert.equal(linked.approvalWorkflowId, out.workflowId)
  assert.equal(linked.approvalState, 'PENDING_APPROVAL')
})

test('duplicate submission returns conflict and does not create duplicate workflow', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-dupe', 'rec-dupe'))
  await svc.submitForApproval({ tenantId: 'tenant-approval-dupe', recommendationId: 'rec-dupe' })
  await assert.rejects(() => svc.submitForApproval({ tenantId: 'tenant-approval-dupe', recommendationId: 'rec-dupe' }), (error: any) => error instanceof RecommendationApprovalError && error.status === 409)
})

test('blocked recommendation cannot be submitted', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-blocked', 'rec-blocked', { executionReadiness: 'BLOCKED', recommendationState: 'BLOCKED', blockedReasons: ['POLICY'] }))
  await assert.rejects(() => svc.submitForApproval({ tenantId: 'tenant-approval-blocked', recommendationId: 'rec-blocked' }), (error: any) => error instanceof RecommendationApprovalError && error.status === 422)
})

test('missing evidence blocks submission', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-evidence', 'rec-evidence', { evidencePointers: [] }))
  await assert.rejects(() => svc.submitForApproval({ tenantId: 'tenant-approval-evidence', recommendationId: 'rec-evidence' }), (error: any) => error instanceof RecommendationApprovalError && error.code === 'MISSING_EVIDENCE')
})

test('tenant isolation enforced', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-owner', 'rec-isolated'))
  await assert.rejects(() => svc.submitForApproval({ tenantId: 'tenant-approval-other', recommendationId: 'rec-isolated' }), (error: any) => error instanceof RecommendationApprovalError && error.status === 404)
})

test('governance event appended', async () => {
  const { svc, events } = await serviceWith(rec('tenant-approval-event', 'rec-event'))
  await svc.submitForApproval({ tenantId: 'tenant-approval-event', recommendationId: 'rec-event' })
  assert.ok(events.some((event) => event.eventType === 'RECOMMENDATION_SUBMITTED_FOR_APPROVAL'))
  assert.ok(getEntityTimeline('tenant-approval-event', 'RECOMMENDATION', 'rec-event').some((event) => event.eventType === 'RECOMMENDATION_SUBMITTED_FOR_APPROVAL'))
})

test('no execution request created', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-noexec', 'rec-noexec'))
  const out: any = await svc.submitForApproval({ tenantId: 'tenant-approval-noexec', recommendationId: 'rec-noexec' })
  assert.equal(out.executionRequestId, undefined)
})

test('no dry run created', async () => {
  const { svc } = await serviceWith(rec('tenant-approval-nodry', 'rec-nodry'))
  const out: any = await svc.submitForApproval({ tenantId: 'tenant-approval-nodry', recommendationId: 'rec-nodry' })
  assert.equal(out.dryRunId, undefined)
})
