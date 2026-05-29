import test from 'node:test'
import assert from 'node:assert/strict'
import { outcomeProjectionService } from '../lib/outcomes/outcome-projection-service'
import { monitoredOutcomeService } from '../lib/drift/monitored-outcome-service'
import { evaluateOutcomeDrift } from '../lib/drift/drift-evaluation-runtime'
import { evaluateScheduleRuntime, buildScheduleRuntimeRows } from '../lib/scheduling/schedule-runtime'
import { checkM365LiveReadiness } from '../lib/connectors/m365-live-readiness'
import { discoverM365ReadOnly } from '../lib/connectors/m365-live-discovery'
import { generateM365RecommendationsFromLiveReadOnly } from '../lib/connectors/m365-live-recommendation-bridge'
import { getEntityTimeline } from '../lib/events/evidence-timeline'

test('outcome propagation updates command metrics', () => {
  outcomeProjectionService.project({ tenantId:'tenant-runtime', outcomeId:'out-1', verificationState:'VERIFIED', projectedMonthlySavings:50, verifiedMonthlySavings:50, projectedAnnualSavings:600, verifiedAnnualSavings:600, savingsVariance:0, verifiedAt:new Date() })
  const metrics = outcomeProjectionService.commandMetrics('tenant-runtime')
  assert.equal(metrics.totalVerifiedSavings, 50)
  assert.equal(metrics.verifiedOutcomeCount, 1)
})

test('campaign updates from outcome projections', () => {
  const campaigns = outcomeProjectionService.campaignProjections('tenant-runtime')
  assert.equal(campaigns[0].verifiedSavings, 50)
  assert.equal(campaigns[0].outcomeStatus, 'COMPLETED')
})

test('verified outcome registers for drift monitoring', () => {
  const row = monitoredOutcomeService.register({ tenantId:'tenant-runtime', outcomeId:'out-1', entityType:'M365_USER', entityId:'user-1', verificationDate:new Date().toISOString() })
  assert.equal(row.monitoringState, 'MONITORED')
})

test('drift evaluation emits drift event', () => {
  monitoredOutcomeService.register({ tenantId:'tenant-runtime-drift', outcomeId:'out-drift', entityType:'M365_USER', entityId:'user-1', verificationDate:new Date().toISOString() })
  const out = evaluateOutcomeDrift({ tenantId:'tenant-runtime-drift', outcomeId:'out-drift', verificationEvidence:{ removedSkuIds:['E5'], afterAssignedSkuIds:['E5'] } })
  const events = getEntityTimeline('tenant-runtime-drift', 'OUTCOME', 'out-drift')
  assert.equal(out.driftState, 'DRIFT_DETECTED')
  assert.ok(events.some((event) => event.eventType === 'DRIFT_DETECTED'))
})

test('schedule runtime marks ready execution requests', () => {
  const state = evaluateScheduleRuntime({ executionRequest:{ readinessState:'READY_FOR_EXECUTION' }, approvalWorkflow:{ approvalState:'APPROVED' }, dryRun:{ simulationState:'READY_FOR_EXECUTION' }, connectorHealth:'READY' })
  assert.equal(state, 'READY')
})

test('schedule runtime blocks degraded connector', () => {
  const state = evaluateScheduleRuntime({ executionRequest:{ readinessState:'READY_FOR_EXECUTION' }, dryRun:{ simulationState:'READY_FOR_EXECUTION' }, connectorHealth:'DEGRADED' })
  assert.equal(state, 'BLOCKED')
})

test('schedule read model uses execution requests', () => {
  const rows = buildScheduleRuntimeRows('tenant-runtime-schedule', [{ requestId:'exec-1', actionType:'REMOVE_LICENSE', readinessState:'READY_FOR_EXECUTION', projectedMonthlySavings:20 }], [{ executionRequestId:'exec-1', simulationState:'READY_FOR_EXECUTION' }], 'READY')
  assert.equal(rows[0].executionRequestIds[0], 'exec-1')
  assert.equal(rows[0].status, 'READY')
})

test('live m365 readiness checks token and scopes', async () => {
  const out = await checkM365LiveReadiness({ grantedScopes:['User.Read.All','Directory.Read.All'], tokenProvider: async () => ({ accessToken:'token', requestId:'req' }) })
  assert.equal(out.state, 'READY')
})

test('live recommendation creation from read-only discovery', async () => {
  const summary = await generateM365RecommendationsFromLiveReadOnly({ tenantId:'tenant-runtime-m365', discovery: async ({tenantId}:any) => ({ tenantId, readOnly:true, users:[{ tenantId, userId:'u1', userPrincipalName:'u1@example.com', accountEnabled:true, assignedLicenses:['E5'], lastLoginDaysAgo:120, lifecycleState:'TRUSTED', confidenceScore:0.9, sourceReferences:['m365:user:u1'], connectorHealth:'HEALTHY', dataFreshnessScore:0.9, ingestionRunId:'run-1' }] }) as any })
  assert.equal(summary.readOnly, true)
  assert.equal(summary.scannedUsers, 1)
  assert.ok(summary.recommendationsCreated >= 1)
})

test('tenant isolation in projections', () => {
  assert.equal(outcomeProjectionService.commandMetrics('tenant-runtime-other').totalVerifiedSavings, 0)
})

test('read-only enforcement and no connector mutation', async () => {
  const discovery = await discoverM365ReadOnly({ tenantId:'tenant-readonly', tokenProvider: async () => ({ accessToken:'token' }), usersProvider: async () => ({ users:[], requestId:'u' }), licencesProvider: async () => ({ licencesByUpn:{}, requestId:'l' }), activityProvider: async () => ({ lastLoginDaysByUpn:{}, requestId:'a' }) })
  assert.equal(discovery.readOnly, true)
  assert.equal((discovery as any).mutationId, undefined)
})
