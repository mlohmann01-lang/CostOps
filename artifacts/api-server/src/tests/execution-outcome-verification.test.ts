import test from 'node:test'
import assert from 'node:assert/strict'
import { ExecutionOutcomeVerificationService } from '../lib/outcomes/execution-outcome-verification-service'
import { ExecutionRequestRepository } from '../lib/execution/execution-request-repository'
import { ExecutionResultRecorder } from '../lib/execution/execution-result-recorder'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'
import { RecommendationGovernanceEventRepository } from '../lib/recommendations/governance-event-repository'
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service'
import { ExecutionOutcomeRepository } from '../lib/outcomes/execution-outcome-repository'
import { getEntityTimeline } from '../lib/events/evidence-timeline'
import type { GovernedRecommendationObject } from '../lib/recommendations/types'

const results = new ExecutionResultRecorder()
const requests = new ExecutionRequestRepository()
const recs = new GovernedRecommendationRepository()
const events = new RecommendationGovernanceEventService(new RecommendationGovernanceEventRepository({ storageMode: 'memory' }))
const outcomes = new ExecutionOutcomeRepository()
const service = new ExecutionOutcomeVerificationService(results, requests, recs, outcomes, events)

const rec = (tenantId:string, recommendationId:string, actionType='REMOVE_LICENSE'): GovernedRecommendationObject => ({ recommendationId, tenantId, playbookId: 'M365_INACTIVE_LICENSED_USER_RECLAIM', targetEntityId: 'user-1', targetEntityType: 'User', graphNodeIds: [], graphEdgeIds: [], discoveryLifecycleState: 'TRUSTED', confidenceScore: 0.95, reliabilityBand: 'HIGH', projectedMonthlySavings: 40, projectedAnnualSavings: 480, savingsConfidence: 'HIGH', actionType, actionRiskClass: 'B', executionReadiness: 'APPROVAL_REQUIRED', readinessReasons: [], blockedReasons: [], requiredApprovals: ['OWNER'], evidencePointers: ['m365:user:user-1'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), recommendationState: 'APPROVAL_REQUIRED' })

async function seed(tenantId:string, recommendationId:string, evidence:string[], actionType='REMOVE_LICENSE', state='EXECUTED') {
  await recs.upsert(tenantId, rec(tenantId, recommendationId, actionType), ['src'])
  const req = await requests.createExecutionRequest({ requestId: `exec-${recommendationId}`, tenantId, recommendationId, approvalWorkflowId: `wf-${recommendationId}`, actionType, playbookId: 'M365_INACTIVE_LICENSED_USER_RECLAIM', platform: 'M365', riskClass: 'B', readinessState: 'READY_FOR_EXECUTION', executionMode: 'SUPERVISED', rollbackCoverage: 'FULL', projectedMonthlySavings: 40, projectedAnnualSavings: 480, createdAt: new Date().toISOString(), createdByWorkflowId: `wf-${recommendationId}`, governanceStatus: 'VALID', metadata: { targetEntityId: 'user-1' } })
  const result = await results.create({ executionResultId: `res-${recommendationId}`, tenantId, executionRequestId: req.requestId, executionState: state, executedActions: [{ action: actionType, targetEntityId: 'user-1' }], executionEvidence: evidence, rollbackReference: 'rb-1', executionWarnings: [], executionErrors: [], startedAt: new Date(), completedAt: new Date(), executedBy: 'operator' })
  return { req, result }
}

test('completed REMOVE_LICENSE execution verifies successfully from before/after evidence', async () => {
  const { result } = await seed('tenant-outcome-ok', 'rec-outcome-ok', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:none'])
  const out = await service.verify('tenant-outcome-ok', result.executionResultId)
  assert.equal(out.outcome?.verificationState, 'VERIFIED')
  assert.equal(out.outcome?.verifiedMonthlySavings, 40)
})

test('SKU still present after execution fails verification', async () => {
  const { result } = await seed('tenant-outcome-fail-sku', 'rec-outcome-fail-sku', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:E5'])
  const out = await service.verify('tenant-outcome-fail-sku', result.executionResultId)
  assert.equal(out.outcome?.verificationState, 'VERIFICATION_FAILED')
  assert.equal(out.outcome?.verifiedMonthlySavings, 0)
})

test('missing evidence produces partial controlled outcome', async () => {
  const { result } = await seed('tenant-outcome-partial', 'rec-outcome-partial', ['m365:remove_license:user-1'])
  const out = await service.verify('tenant-outcome-partial', result.executionResultId)
  assert.equal(out.outcome?.verificationState, 'PARTIALLY_VERIFIED')
  assert.equal(out.outcome?.verifiedMonthlySavings, 20)
})

test('unsupported action produces controlled failed outcome', async () => {
  const { result } = await seed('tenant-outcome-unsupported', 'rec-outcome-unsupported', ['m365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:E3'], 'RIGHTSIZE_LICENSE')
  const out = await service.verify('tenant-outcome-unsupported', result.executionResultId)
  assert.equal(out.outcome?.verificationState, 'VERIFICATION_FAILED')
  assert.match(JSON.stringify(out.outcome?.verificationEvidence), /UNSUPPORTED_ACTION/)
})

test('projected vs verified savings computed correctly', async () => {
  const { result } = await seed('tenant-outcome-savings', 'rec-outcome-savings', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:none'])
  const out = await service.verify('tenant-outcome-savings', result.executionResultId)
  assert.equal(out.outcome?.projectedAnnualSavings, 480)
  assert.equal(out.outcome?.verifiedAnnualSavings, 480)
  assert.equal(out.outcome?.savingsVariance, 0)
})

test('outcome persisted and GET returns latest', async () => {
  const { result } = await seed('tenant-outcome-latest', 'rec-outcome-latest', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:none'])
  const out = await service.verify('tenant-outcome-latest', result.executionResultId)
  const latest = await service.getLatest('tenant-outcome-latest', result.executionResultId)
  assert.equal(latest.outcome?.outcomeId, out.outcome?.outcomeId)
})

test('governance/runtime events emitted', async () => {
  const { result } = await seed('tenant-outcome-events', 'rec-outcome-events', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:none'])
  await service.verify('tenant-outcome-events', result.executionResultId)
  const timeline = getEntityTimeline('tenant-outcome-events', 'EXECUTION_RESULT', result.executionResultId)
  assert.ok(timeline.some((event) => event.eventType === 'OUTCOME_VERIFICATION_STARTED'))
  assert.ok(timeline.some((event) => event.eventType === 'OUTCOME_VERIFIED'))
})

test('tenant isolation enforced', async () => {
  const { result } = await seed('tenant-outcome-owner', 'rec-outcome-owner', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:none'])
  await assert.rejects(() => service.verify('tenant-outcome-other', result.executionResultId), (error:any) => error.status === 404)
})

test('no rollback/remediation/connector mutation occurs', async () => {
  const { result } = await seed('tenant-outcome-safe', 'rec-outcome-safe', ['m365:remove_license:user-1', 'm365:license_before:user-1:sku:E5', 'm365:license_after:user-1:sku:none'])
  const out:any = await service.verify('tenant-outcome-safe', result.executionResultId)
  assert.equal(out.rollbackExecutionId, undefined)
  assert.equal(out.remediationId, undefined)
  assert.equal(out.connectorMutationId, undefined)
})
