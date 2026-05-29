import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import recommendationsRouter from '../routes/recommendations'
import approvalWorkflowsRouter from '../routes/approval-workflows'
import executionRequestsRouter from '../routes/execution-requests'
import { GovernedRecommendationRepository } from '../lib/recommendations/recommendation-repository'
import { getEntityTimeline } from '../lib/events/evidence-timeline'
import type { GovernedRecommendationObject } from '../lib/recommendations/types'

const app = express()
const repo = new GovernedRecommendationRepository()
app.use(express.json())
app.use((req: any, _res, next) => { req.tenantId = req.header('x-tenant-id') ?? 'tenant-phase4'; next() })
app.use('/api/recommendations', recommendationsRouter)
app.use('/api/approval-workflows', approvalWorkflowsRouter)
app.use('/api', executionRequestsRouter)
let baseUrl = ''
let server: any

const rec = (tenantId: string, recommendationId: string): GovernedRecommendationObject => ({
  recommendationId,
  tenantId,
  playbookId: 'M365_INACTIVE_LICENSED_USER_RECLAIM',
  targetEntityId: 'user-approval-exec',
  targetEntityType: 'User',
  graphNodeIds: [],
  graphEdgeIds: [],
  discoveryLifecycleState: 'TRUSTED',
  confidenceScore: 0.91,
  reliabilityBand: 'HIGH',
  projectedMonthlySavings: 57,
  projectedAnnualSavings: 684,
  savingsConfidence: 'HIGH',
  actionType: 'REMOVE_LICENSE',
  actionRiskClass: 'A',
  executionReadiness: 'APPROVAL_REQUIRED',
  readinessReasons: ['Approval required'],
  blockedReasons: [],
  requiredApprovals: ['OWNER'],
  evidencePointers: ['m365:user:user-approval-exec'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  recommendationState: 'APPROVAL_REQUIRED',
})

test.before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as any).port}`
})

test.after(async () => { await new Promise((resolve) => server.close(resolve)) })

async function approvedFlow(tenantId: string, recommendationId: string) {
  await repo.upsert(tenantId, rec(tenantId, recommendationId), ['src'])
  const submitted = await fetch(`${baseUrl}/api/recommendations/${recommendationId}/submit-approval`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId }, body: JSON.stringify({ actorId: 'operator', actorRole: 'OWNER' }) })
  const submittedText = await submitted.text()
  assert.equal(submitted.status, 200, submittedText)
  const submission = JSON.parse(submittedText)
  const approved = await fetch(`${baseUrl}/api/approval-workflows/${submission.workflowId}/approve`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId }, body: JSON.stringify({ actorId: 'owner-1', actorRoles: ['OWNER'] }) })
  const approvedText = await approved.text()
  assert.equal(approved.status, 200, approvedText)
  return JSON.parse(approvedText)
}

test('approved workflow creates request', async () => {
  const out = await approvedFlow('tenant-phase4-create', 'rec-phase4-create')
  assert.equal(out.approvalState, 'APPROVED')
  assert.equal(out.executionRequest.recommendationId, 'rec-phase4-create')
  assert.equal(out.executionRequest.readinessState, 'PENDING_DRY_RUN')
})

test('duplicate request blocked', async () => {
  const tenantId = 'tenant-phase4-dupe'
  const first = await approvedFlow(tenantId, 'rec-phase4-dupe')
  const again = await fetch(`${baseUrl}/api/approval-workflows/${first.workflowId}/approve`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId }, body: JSON.stringify({ actorId: 'owner-1', actorRoles: ['OWNER'] }) })
  assert.equal(again.status, 200)
  const rows = await (await fetch(`${baseUrl}/api/execution-requests`, { headers: { 'x-tenant-id': tenantId } })).json() as any[]
  assert.equal(rows.filter((row) => row.recommendationId === 'rec-phase4-dupe').length, 1)
})

test('tenant isolation', async () => {
  await approvedFlow('tenant-phase4-isolated', 'rec-phase4-isolated')
  const rows = await (await fetch(`${baseUrl}/api/execution-requests`, { headers: { 'x-tenant-id': 'tenant-phase4-other' } })).json() as any[]
  assert.equal(rows.length, 0)
})

test('timeline event emitted', async () => {
  const out = await approvedFlow('tenant-phase4-event', 'rec-phase4-event')
  const timeline = getEntityTimeline('tenant-phase4-event', 'EXECUTION_REQUEST', out.executionRequest.requestId)
  assert.ok(timeline.some((event) => event.eventType === 'EXECUTION_REQUEST_CREATED'))
})

test('recommendation linkage created', async () => {
  const tenantId = 'tenant-phase4-link'
  const out = await approvedFlow(tenantId, 'rec-phase4-link')
  const linked: any = await repo.getByRecommendationId(tenantId, 'rec-phase4-link')
  assert.equal(linked.executionRequestId, out.executionRequest.requestId)
  assert.equal(linked.executionRequestState, 'PENDING_DRY_RUN')
})

test('no execution occurs', async () => {
  const out = await approvedFlow('tenant-phase4-noexec', 'rec-phase4-noexec')
  assert.equal(out.executionRequest.executedAt, undefined)
  assert.equal(out.executionRequest.readinessState, 'PENDING_DRY_RUN')
})

test('no dry-run occurs', async () => {
  const out = await approvedFlow('tenant-phase4-nodry', 'rec-phase4-nodry')
  assert.equal(out.executionRequest.dryRunId, undefined)
})

test('no scheduling occurs', async () => {
  const out = await approvedFlow('tenant-phase4-noschedule', 'rec-phase4-noschedule')
  assert.equal(out.executionRequest.scheduleId, undefined)
})
