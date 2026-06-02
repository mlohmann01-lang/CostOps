import test from 'node:test'
import assert from 'node:assert/strict'
import { OnboardingService } from '../lib/onboarding/onboarding-service'
import { OnboardingRepository } from '../lib/onboarding/onboarding-repository'
import { platformEventService } from '../lib/events/platform-event-service'

function svc(overrides: any = {}) { const repo = new OnboardingRepository(); return { repo, service: new OnboardingService(repo, { readiness: async () => ({ tenantId: 't1', authState: 'READY', readReady: true, writeReady: false, graphReachable: true, tokenAcquired: true, requiredReadPermissions: [], requiredWritePermissions: [], blockers: [], warnings: ['Write permission not granted'], checkedAt: new Date().toISOString() }), discovery: async () => ({ tenantId: 't1', snapshotId: 'snap-1', status: 'COMPLETED', counts: { users: 1, enabledUsers: 1, disabledUsers: 0, licensedUsers: 1, skus: 1, usageRecords: 1, mailboxes: 1, groups: 1 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() }), trust: async () => ({ tenantId: 't1', globalTrustScore: 80, globalTrustBand: 'HIGH', identityTrust: { band: 'HIGH', score: 80, reasons: [] }, licenseTrust: { band: 'HIGH', score: 80, reasons: [] }, usageTrust: { band: 'HIGH', score: 80, reasons: [] }, activityTrust: { band: 'HIGH', score: 80, reasons: [] }, mailboxTrust: { band: 'HIGH', score: 80, reasons: [] }, executionSafetyTrust: { band: 'INVESTIGATE', score: 60, reasons: [] }, blockers: [], warnings: [], recommendations: [], generatedAt: new Date().toISOString() }), opportunityFactory: async () => ({ tenantId: 't1', opportunities: [{ id: 'o1', economicAssessment: {} }], providerResults: [{ source: 'M365_PLAYBOOK', succeeded: true, generated: 1 }], deduplicated: 0, persisted: 1, summary: {}, health: { opportunitiesGenerated: 1 } }), playbookHealth: () => ({ state: 'HEALTHY', playbooksRun: 7, candidates: 2, opportunitiesGenerated: 1, projectedMonthlySavings: 100, errors: 0, productionReadinessCounts: { readyForApproval: 0, needsHardening: 2, notReady: 0 }, lastRunAt: new Date().toISOString() }), ...overrides }) } }

test('start creates tenant scoped idempotent onboarding state and emits platform event', async () => {
  process.env.M365_TENANT_ID = 'tenant'; process.env.M365_CLIENT_ID = 'client'; process.env.M365_CLIENT_SECRET = 'secret'
  const { service } = svc()
  const first = await service.getOrCreateOnboarding('tenant-a', 'M365')
  const second = await service.getOrCreateOnboarding('tenant-a', 'M365')
  assert.equal(first.onboardingId, second.onboardingId)
  assert.equal(first.steps.find((s) => s.stepId === 'WORKSPACE_SETUP')?.state, 'PASSED')
  assert.equal(first.steps.find((s) => s.stepId === 'CONNECT_M365')?.state, 'PASSED')
  const events = await platformEventService.listEvents('tenant-a')
  assert.ok(events.some((event: any) => event.type === 'TENANT_ONBOARDING_STARTED'))
})

test('missing config blocks onboarding without approvals or execution requests', async () => {
  delete process.env.M365_TENANT_ID; delete process.env.M365_CLIENT_ID; delete process.env.M365_CLIENT_SECRET; delete process.env.M365_MANAGED_IDENTITY_CLIENT_ID
  const { service } = svc()
  const state = await service.getOrCreateOnboarding('tenant-missing', 'M365')
  assert.equal(state.status, 'BLOCKED')
  assert.ok(state.blockers.some((blocker) => blocker.includes('Missing tenantId')))
})

test('readiness discovery trust opportunity and pilot gates update steps safely', async () => {
  process.env.M365_TENANT_ID = 'tenant'; process.env.M365_CLIENT_ID = 'client'; process.env.M365_CLIENT_SECRET = 'secret'
  const { service } = svc()
  assert.equal((await service.runReadinessCheck('t1')).steps.find((s) => s.stepId === 'READINESS_CHECK')?.state, 'WARNING')
  assert.equal((await service.runDiscovery('t1')).steps.find((s) => s.stepId === 'DISCOVERY')?.state, 'PASSED')
  assert.equal((await service.runTrustAssessment('t1')).steps.find((s) => s.stepId === 'TRUST_ASSESSMENT')?.state, 'WARNING')
  assert.equal((await service.runOpportunityAssessment('t1')).steps.find((s) => s.stepId === 'OPPORTUNITY_ASSESSMENT')?.state, 'WARNING')
  assert.equal((await service.setPilotMode('t1', 'READ_ONLY')).pilotMode, 'READ_ONLY')
  assert.equal((await service.setPilotMode('t1', 'DRY_RUN')).pilotMode, 'DRY_RUN')
  const controlled = await service.setPilotMode('t1', 'CONTROLLED_EXECUTION')
  assert.equal(controlled.steps.find((s) => s.stepId === 'PILOT_MODE')?.state, 'BLOCKED')
  assert.ok(controlled.blockers.some((blocker) => blocker.includes('writeReady')))
})

test('tenant isolation keeps one active onboarding per tenant/provider', async () => {
  process.env.M365_TENANT_ID = 'tenant'; process.env.M365_CLIENT_ID = 'client'; process.env.M365_CLIENT_SECRET = 'secret'
  const { service } = svc()
  const a = await service.getOrCreateOnboarding('tenant-a', 'M365')
  const b = await service.getOrCreateOnboarding('tenant-b', 'M365')
  assert.notEqual(a.onboardingId, b.onboardingId)
})
