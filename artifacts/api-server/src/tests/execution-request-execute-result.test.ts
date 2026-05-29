import test from 'node:test'
import assert from 'node:assert/strict'
import { ExecutionRuntime } from '../lib/execution/execution-runtime'
import { ExecutionRequestDryRunService } from '../lib/execution/execution-request-dry-run-service'
import { ExecutionRequestRepository } from '../lib/execution/execution-request-repository'
import { ExecutionDryRunRepository } from '../lib/execution/dry-run-repository'
import { ExecutionResultRecorder } from '../lib/execution/execution-result-recorder'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'
import { RecommendationGovernanceEventRepository } from '../lib/recommendations/governance-event-repository'
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service'
import { getEntityTimeline } from '../lib/events/evidence-timeline'
import type { GovernedRecommendationObject } from '../lib/recommendations/types'
import type { ExecutionRequestV1 } from '../lib/execution/types'

const requestRepo = new ExecutionRequestRepository()
const dryRunRepo = new ExecutionDryRunRepository()
const recRepo = new GovernedRecommendationRepository()
const eventRepo = new RecommendationGovernanceEventRepository({ storageMode: 'memory' })
const governance = new RecommendationGovernanceEventService(eventRepo)
const resultRecorder = new ExecutionResultRecorder()
const dryRunService = new ExecutionRequestDryRunService(requestRepo, recRepo, governance, dryRunRepo)
const runtime = new ExecutionRuntime(requestRepo, dryRunRepo, recRepo, governance, resultRecorder)

function rec(tenantId: string, recommendationId: string): GovernedRecommendationObject {
  return { recommendationId, tenantId, playbookId: 'M365_INACTIVE_LICENSED_USER_RECLAIM', targetEntityId: 'inactive-user-1', targetEntityType: 'User', graphNodeIds: [], graphEdgeIds: [], discoveryLifecycleState: 'TRUSTED', confidenceScore: 0.94, reliabilityBand: 'HIGH', projectedMonthlySavings: 30, projectedAnnualSavings: 360, savingsConfidence: 'HIGH', actionType: 'REMOVE_LICENSE', actionRiskClass: 'B', executionReadiness: 'APPROVAL_REQUIRED', readinessReasons: [], blockedReasons: [], requiredApprovals: ['OWNER'], evidencePointers: ['m365:user:inactive-user-1'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), recommendationState: 'APPROVAL_REQUIRED' }
}

async function seed(tenantId: string, recommendationId: string, readinessState: ExecutionRequestV1['readinessState'] = 'PENDING_DRY_RUN') {
  await recRepo.upsert(tenantId, rec(tenantId, recommendationId), ['m365:user:inactive-user-1'])
  const req = await requestRepo.createExecutionRequest({ requestId: `exec-${recommendationId}`, tenantId, recommendationId, approvalWorkflowId: `wf-${recommendationId}`, actionType: 'REMOVE_LICENSE', playbookId: 'M365_INACTIVE_LICENSED_USER_RECLAIM', platform: 'M365', riskClass: 'B', readinessState, executionMode: 'SUPERVISED', rollbackCoverage: 'FULL', projectedMonthlySavings: 30, projectedAnnualSavings: 360, createdAt: new Date().toISOString(), createdByWorkflowId: `wf-${recommendationId}`, governanceStatus: 'VALID', metadata: { targetEntityId: 'inactive-user-1', evidencePointers: ['m365:user:inactive-user-1'] } })
  await recRepo.linkExecutionRequest(tenantId, recommendationId, { executionRequestId: req.requestId, executionRequestCreatedAt: req.createdAt, executionRequestState: req.readinessState })
  await governance.emit({ tenantId, recommendationId, eventType: 'RECOMMENDATION_APPROVED', actorId: 'owner', actorRole: 'OWNER' })
  return req
}

test('ready dry-run execution creates execution result', async () => {
  const req = await seed('tenant-execute-result', 'rec-execute-result')
  await dryRunService.run('tenant-execute-result', req.requestId)
  const result = await runtime.execute('tenant-execute-result', req.requestId, 'operator')
  assert.equal(result?.executionState, 'EXECUTED')
  assert.equal(result?.executionRequestId, req.requestId)
  assert.ok((result?.executedActions as any[]).length > 0)
})

test('execution updates request metadata and completed list state', async () => {
  const req = await seed('tenant-execute-linkage', 'rec-execute-linkage')
  await dryRunService.run('tenant-execute-linkage', req.requestId)
  const result = await runtime.execute('tenant-execute-linkage', req.requestId, 'operator')
  const updated = await requestRepo.getExecutionRequest('tenant-execute-linkage', req.requestId)
  assert.equal(updated?.latestExecutionResultId, result?.executionResultId)
  assert.equal(updated?.latestExecutionResultState, 'EXECUTED')
})

test('execute is idempotent for a request', async () => {
  const req = await seed('tenant-execute-idempotent', 'rec-execute-idempotent')
  await dryRunService.run('tenant-execute-idempotent', req.requestId)
  const first = await runtime.execute('tenant-execute-idempotent', req.requestId, 'operator')
  const second = await runtime.execute('tenant-execute-idempotent', req.requestId, 'operator')
  assert.equal(first?.executionResultId, second?.executionResultId)
})

test('execute before ready dry run creates blocked result', async () => {
  const req = await seed('tenant-execute-blocked', 'rec-execute-blocked')
  const result = await runtime.execute('tenant-execute-blocked', req.requestId, 'operator')
  assert.equal(result?.executionState, 'BLOCKED')
  assert.match((result?.executionErrors as string[]).join(' '), /DRY_RUN_NOT_READY/)
})

test('tenant isolation enforced for execution', async () => {
  const req = await seed('tenant-execute-owner', 'rec-execute-owner')
  await dryRunService.run('tenant-execute-owner', req.requestId)
  const result = await runtime.execute('tenant-execute-other', req.requestId, 'operator')
  assert.equal(result, null)
})

test('execution emits timeline events and persists result', async () => {
  const req = await seed('tenant-execute-events', 'rec-execute-events')
  await dryRunService.run('tenant-execute-events', req.requestId)
  const result = await runtime.execute('tenant-execute-events', req.requestId, 'operator')
  const latest = await runtime.getResult('tenant-execute-events', req.requestId)
  const timeline = getEntityTimeline('tenant-execute-events', 'EXECUTION_REQUEST', req.requestId)
  assert.equal(latest?.executionResultId, result?.executionResultId)
  assert.ok(timeline.some((event) => event.eventType === 'EXECUTION_STARTED'))
  assert.ok(timeline.some((event) => event.eventType === 'EXECUTION_COMPLETED'))
})
