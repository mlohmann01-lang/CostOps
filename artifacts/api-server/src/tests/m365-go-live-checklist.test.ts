import test from 'node:test'
import assert from 'node:assert/strict'
import { buildM365GoLiveChecklist } from '../lib/onboarding/m365-go-live-checklist'
import type { TenantOnboardingState } from '../lib/onboarding/onboarding-types'
import { M365_ONBOARDING_STEPS, M365_ONBOARDING_STEP_LABELS } from '../lib/onboarding/onboarding-types'

function state(): TenantOnboardingState { return { tenantId: 't', onboardingId: 'o', provider: 'M365', currentStep: 'PILOT_MODE', status: 'READY_FOR_PILOT', pilotMode: 'DRY_RUN', blockers: [], warnings: [], createdAt: '', updatedAt: '', readiness: { readReady: true, writeReady: false, graphReachable: true, status: 'READY' }, discovery: { status: 'COMPLETED', snapshotId: 'snap' }, trust: { identityTrust: { band: 'HIGH' }, licenseTrust: { band: 'HIGH' }, usageTrust: { band: 'HIGH' }, activityTrust: { band: 'HIGH' }, mailboxTrust: { band: 'HIGH' }, executionSafetyTrust: { band: 'INVESTIGATE' } }, opportunityAssessment: { playbooksRun: 7, candidates: 1, opportunitiesGenerated: 1, economicAssessmentPresent: true }, steps: M365_ONBOARDING_STEPS.map((stepId) => ({ stepId, label: M365_ONBOARDING_STEP_LABELS[stepId], state: 'PASSED', blockers: [], warnings: [], evidenceRefs: [] })) } }

test('checklist contains 20 items and summarizes dry-run readiness with warnings', () => {
  const checklist = buildM365GoLiveChecklist(state())
  assert.equal(checklist.summary.total, 20)
  assert.equal(checklist.summary.readiness, 'DRY_RUN_READY')
  assert.ok(checklist.items.some((item) => item.label === 'Execution safety gates configured' && item.status === 'WARNING'))
  assert.ok(checklist.items.some((item) => item.label === 'Optional write permissions identified' && item.status === 'WARNING'))
})

test('controlled execution is not ready when write readiness or trust is blocked', () => {
  const s = state(); s.pilotMode = 'CONTROLLED_EXECUTION'; s.readiness.writeReady = false; s.trust.executionSafetyTrust.band = 'LOW_CONFIDENCE'
  const checklist = buildM365GoLiveChecklist(s)
  assert.equal(checklist.summary.readiness, 'NOT_READY')
  assert.ok(checklist.summary.blocked > 0)
})
