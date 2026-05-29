import test from 'node:test'
import assert from 'node:assert/strict'
import { ExecutionRequestRepository } from '../lib/execution/execution-request-repository'
import { ExecutionRequestDryRunService } from '../lib/execution/execution-request-dry-run-service'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'
import { getEntityTimeline } from '../lib/events/evidence-timeline'
import type { GovernedRecommendationObject } from '../lib/recommendations/types'
import type { ExecutionRequestV1 } from '../lib/execution/types'

const recRepo = new GovernedRecommendationRepository()
const reqRepo = new ExecutionRequestRepository()
const svc = new ExecutionRequestDryRunService(reqRepo, recRepo)

function rec(tenantId: string, recommendationId: string, actionType = 'REMOVE_LICENSE', evidencePointers = ['m365:user:u1']): GovernedRecommendationObject {
  return { recommendationId, tenantId, playbookId: actionType.includes('COPILOT') ? 'M365_COPILOT_UTILISATION_V1' : 'M365_INACTIVE_LICENSED_USER_RECLAIM', targetEntityId: 'u1', targetEntityType: 'User', graphNodeIds: [], graphEdgeIds: [], discoveryLifecycleState: 'TRUSTED', confidenceScore: 0.9, reliabilityBand: 'HIGH', projectedMonthlySavings: 30, projectedAnnualSavings: 360, savingsConfidence: 'HIGH', actionType, actionRiskClass: 'A', executionReadiness: 'APPROVAL_REQUIRED', readinessReasons: [], blockedReasons: [], requiredApprovals: ['OWNER'], evidencePointers, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), recommendationState: 'APPROVAL_REQUIRED' }
}

async function seed(tenantId: string, recommendationId: string, actionType = 'REMOVE_LICENSE', evidencePointers = ['m365:user:u1'], readinessState: ExecutionRequestV1['readinessState'] = 'PENDING_DRY_RUN') {
  await recRepo.upsert(tenantId, rec(tenantId, recommendationId, actionType, evidencePointers), evidencePointers)
  const req = await reqRepo.createExecutionRequest({ requestId: `exec-${recommendationId}`, tenantId, recommendationId, approvalWorkflowId: `wf-${recommendationId}`, actionType, playbookId: actionType.includes('COPILOT') ? 'M365_COPILOT_UTILISATION_V1' : 'M365_INACTIVE_LICENSED_USER_RECLAIM', platform: 'M365', riskClass: 'A', readinessState, executionMode: 'SUPERVISED', rollbackCoverage: 'FULL', projectedMonthlySavings: 30, projectedAnnualSavings: 360, createdAt: new Date().toISOString(), createdByWorkflowId: `wf-${recommendationId}`, governanceStatus: 'VALID', metadata: { targetEntityId: 'u1', evidencePointers } })
  await recRepo.linkExecutionRequest(tenantId, recommendationId, { executionRequestId: req.requestId, executionRequestCreatedAt: req.createdAt, executionRequestState: req.readinessState })
  return req
}

test('PENDING_DRY_RUN request runs dry run successfully', async () => {
  const req = await seed('tenant-dryrun-pending', 'rec-pending')
  const out = await svc.run('tenant-dryrun-pending', req.requestId)
  assert.equal(out.executionRequestId, req.requestId)
  assert.equal(out.dryRun.executionRequestId, req.requestId)
})

test('REMOVE_LICENSE produces READY_FOR_EXECUTION when simulator passes', async () => {
  const req = await seed('tenant-dryrun-remove', 'rec-remove')
  const out = await svc.run('tenant-dryrun-remove', req.requestId)
  assert.equal(out.dryRun.simulationState, 'READY_FOR_EXECUTION')
  assert.equal(out.readinessState, 'READY_FOR_EXECUTION')
})

test('RECLAIM_COPILOT_LICENSE produces supported dry run if evidence exists', async () => {
  const evidence = ['m365:user:u1', 'm365:copilot-sku:COPILOT', 'm365:copilot-usage:none', 'm365:copilot-assignment-snapshot:COPILOT']
  const req = await seed('tenant-dryrun-copilot', 'rec-copilot', 'RECLAIM_COPILOT_LICENSE', evidence)
  const out = await svc.run('tenant-dryrun-copilot', req.requestId)
  assert.equal(out.dryRun.simulationState, 'READY_FOR_EXECUTION')
  assert.equal(out.dryRun.rollbackSupported, true)
})

test('unsupported RIGHTSIZE_LICENSE returns controlled requires-review result', async () => {
  const req = await seed('tenant-dryrun-rightsize', 'rec-rightsize', 'RIGHTSIZE_LICENSE')
  const out = await svc.run('tenant-dryrun-rightsize', req.requestId)
  assert.equal(out.dryRun.simulationState, 'REQUIRES_REVIEW')
  assert.match(out.dryRun.validationWarnings.join(' '), /Rightsizing dry run is not yet supported/)
})

test('blocked dry run updates execution request readiness to DRY_RUN_BLOCKED', async () => {
  const req = await seed('tenant-dryrun-blocked', 'rec-blocked', 'RECLAIM_COPILOT_LICENSE', ['m365:user:u1'])
  const out = await svc.run('tenant-dryrun-blocked', req.requestId)
  const updated = await reqRepo.getExecutionRequest('tenant-dryrun-blocked', req.requestId)
  assert.equal(out.readinessState, 'DRY_RUN_BLOCKED')
  assert.equal(updated?.readinessState, 'DRY_RUN_BLOCKED')
})

test('successful dry run updates readiness to READY_FOR_EXECUTION', async () => {
  const req = await seed('tenant-dryrun-ready', 'rec-ready')
  await svc.run('tenant-dryrun-ready', req.requestId)
  const updated = await reqRepo.getExecutionRequest('tenant-dryrun-ready', req.requestId)
  assert.equal(updated?.readinessState, 'READY_FOR_EXECUTION')
})

test('dry run emits governance/runtime events', async () => {
  const req = await seed('tenant-dryrun-events', 'rec-events')
  await svc.run('tenant-dryrun-events', req.requestId)
  const timeline = getEntityTimeline('tenant-dryrun-events', 'EXECUTION_REQUEST', req.requestId)
  assert.ok(timeline.some((event) => event.eventType === 'DRY_RUN_STARTED'))
  assert.ok(timeline.some((event) => event.eventType === 'DRY_RUN_COMPLETED'))
})

test('dry run result persisted and GET returns latest', async () => {
  const req = await seed('tenant-dryrun-latest', 'rec-latest')
  const out = await svc.run('tenant-dryrun-latest', req.requestId)
  const latest = await svc.getLatest('tenant-dryrun-latest', req.requestId)
  assert.equal(latest.dryRun?.dryRunId, out.dryRun.dryRunId)
})

test('tenant isolation enforced', async () => {
  const req = await seed('tenant-dryrun-owner', 'rec-tenant')
  await assert.rejects(() => svc.run('tenant-dryrun-other', req.requestId), (error: any) => error.status === 404)
})

test('no execution result created', async () => {
  const req = await seed('tenant-dryrun-noexec', 'rec-noexec')
  const out: any = await svc.run('tenant-dryrun-noexec', req.requestId)
  assert.equal(out.executionResultId, undefined)
})

test('no connector mutation occurs', async () => {
  const req = await seed('tenant-dryrun-noconnector', 'rec-noconnector')
  const out: any = await svc.run('tenant-dryrun-noconnector', req.requestId)
  assert.equal(out.connectorMutationId, undefined)
})
