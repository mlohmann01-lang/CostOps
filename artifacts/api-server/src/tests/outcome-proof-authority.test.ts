import test from 'node:test'
import assert from 'node:assert/strict'
import { listUnifiedEvents } from '../lib/events/evidence-timeline'
import { OutcomeProofService } from '../lib/outcomes/outcome-proof-service'

function service() { const svc = new OutcomeProofService(); svc.clearForTests(); return svc }

test('recommendation/opportunity projection creates PROJECTED proof and tenant isolation', async () => {
  const svc = service()
  const proof = await svc.projectFromRecommendation('tenant-a3', { recommendationId: 'rec-1', opportunityId: 'opp-1', projectedMonthlySavings: 100, playbookId: 'm365' })
  assert.equal(proof.proofState, 'PROJECTED')
  assert.equal(proof.evidenceSummary.hasProjectionEvidence, true)
  assert.equal((await svc.listProofs('other-tenant')).length, 0)
})

test('approval, execution, verification, drift projections advance one proof without duplicates', async () => {
  const svc = service()
  await svc.projectFromRecommendation('tenant-a3-flow', { recommendationId: 'rec-1', projectedMonthlySavings: 100 })
  await svc.projectFromApproval('tenant-a3-flow', { workflowId: 'wf-1', targetType: 'RECOMMENDATION', targetId: 'rec-1', projectedMonthlySavings: 100 })
  await svc.projectFromExecutionResult('tenant-a3-flow', { executionResultId: 'exec-result-1', executionRequestId: 'exec-request-1', recommendationId: 'rec-1', projectedMonthlySavings: 100 })
  const verified = await svc.projectFromVerification('tenant-a3-flow', { outcomeId: 'outcome-rec-1', executionResultId: 'exec-result-1', executionRequestId: 'exec-request-1', recommendationId: 'rec-1', verificationState: 'VERIFIED', projectedMonthlySavings: 100, verifiedMonthlySavings: 90, verificationConfidence: 'HIGH' })
  assert.equal(verified.proofState, 'VERIFIED')
  assert.equal(verified.verifiedMonthlySavings, 90)
  assert.equal(verified.savingsVarianceMonthly, -10)
  assert.equal(verified.evidenceSummary.hasApprovalEvidence, true)
  assert.equal(verified.evidenceSummary.hasExecutionEvidence, true)
  assert.equal(verified.evidenceSummary.hasVerificationEvidence, true)
  await svc.projectFromVerification('tenant-a3-flow', { outcomeId: 'outcome-rec-1', executionResultId: 'exec-result-1', executionRequestId: 'exec-request-1', recommendationId: 'rec-1', verificationState: 'VERIFIED', projectedMonthlySavings: 100, verifiedMonthlySavings: 90, verificationConfidence: 'HIGH' })
  assert.equal((await svc.listProofs('tenant-a3-flow')).length, 1)
  await svc.projectFromDrift('tenant-a3-flow', { outcomeId: verified.outcomeId, driftEventId: 'drift-1', status: 'OPEN' })
  assert.equal((await svc.getProof('tenant-a3-flow', verified.outcomeId))?.proofState, 'DRIFTED')
})

test('failed verification and summary aggregation are canonical and evented once', async () => {
  const svc = service()
  await svc.projectFromRecommendation('tenant-a3-summary', { recommendationId: 'rec-ok', projectedMonthlySavings: 100 })
  await svc.projectFromVerification('tenant-a3-summary', { outcomeId: 'outcome-ok', recommendationId: 'rec-ok', verificationState: 'VERIFIED', projectedMonthlySavings: 100, verifiedMonthlySavings: 80, verificationConfidence: 'HIGH' })
  await svc.projectFromVerification('tenant-a3-summary', { outcomeId: 'outcome-fail', recommendationId: 'rec-fail', verificationState: 'VERIFICATION_FAILED', projectedMonthlySavings: 50, verifiedMonthlySavings: 0, verificationConfidence: 'FAILED' })
  const summary = await svc.getSummary('tenant-a3-summary')
  assert.equal(summary.projectedMonthlySavings, 150)
  assert.equal(summary.verifiedMonthlySavings, 80)
  assert.equal(summary.verificationFailedCount, 1)
  assert.equal(summary.averageConfidenceBand, 'FAILED')
  const events = listUnifiedEvents('tenant-a3-summary').filter((event) => event.entityType === 'OUTCOME_PROOF')
  assert.equal(events.filter((event) => event.eventType === 'OUTCOME_PROOF_VERIFIED').length, 1)
  assert.equal(events.filter((event) => event.eventType === 'OUTCOME_PROOF_FAILED').length, 1)
})

