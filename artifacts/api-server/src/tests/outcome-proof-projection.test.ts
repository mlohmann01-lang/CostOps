import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeProofs, proofFromApproval, proofFromDrift, proofFromExecutionResult, proofFromRecommendation, proofFromVerification } from '../lib/outcomes/outcome-proof-projection'

test('projection helpers create lifecycle proof states with evidence flags', () => {
  const projected = proofFromRecommendation('tenant-a3-proj', { recommendationId: 'rec-1', projectedMonthlySavings: 120, savingsConfidence: 'HIGH' }, '2026-06-01T00:00:00.000Z')
  assert.equal(projected.proofState, 'PROJECTED')
  assert.equal(projected.evidenceSummary.hasProjectionEvidence, true)
  const approved = proofFromApproval('tenant-a3-proj', { targetType: 'RECOMMENDATION', targetId: 'rec-1', workflowId: 'wf-1', projectedMonthlySavings: 120 }, '2026-06-01T01:00:00.000Z')
  const executed = proofFromExecutionResult('tenant-a3-proj', { recommendationId: 'rec-1', executionRequestId: 'req-1', executionResultId: 'res-1', projectedMonthlySavings: 120 }, '2026-06-01T02:00:00.000Z')
  const verified = proofFromVerification('tenant-a3-proj', { recommendationId: 'rec-1', executionRequestId: 'req-1', executionResultId: 'res-1', verificationState: 'VERIFIED', projectedMonthlySavings: 120, verifiedMonthlySavings: 110, verificationConfidence: 'HIGH' }, '2026-06-01T03:00:00.000Z')
  const merged = [approved, executed, verified].reduce((acc, proof) => mergeProofs(acc, proof), projected)
  assert.equal(merged.proofState, 'VERIFIED')
  assert.equal(merged.evidenceSummary.hasApprovalEvidence, true)
  assert.equal(merged.evidenceSummary.hasExecutionEvidence, true)
  assert.equal(merged.evidenceSummary.hasVerificationEvidence, true)
  assert.equal(merged.proofTimeline.map((event) => event.stage).join('>'), 'PROJECTED>APPROVED>EXECUTED>VERIFIED')
})

test('failed verification and drift/protection projections override forward-only state safely', () => {
  const verified = proofFromVerification('tenant-a3-proj2', { outcomeId: 'outcome-1', verificationState: 'VERIFIED', projectedMonthlySavings: 100, verifiedMonthlySavings: 100 }, '2026-06-01T00:00:00.000Z')
  const failed = proofFromVerification('tenant-a3-proj2', { outcomeId: 'outcome-1', verificationState: 'VERIFICATION_FAILED', projectedMonthlySavings: 100, verifiedMonthlySavings: 0 }, '2026-06-01T01:00:00.000Z')
  assert.equal(mergeProofs(verified, failed).proofState, 'FAILED')
  const drifted = proofFromDrift('tenant-a3-proj2', { outcomeId: 'outcome-1', driftEventId: 'drift-open', status: 'OPEN' }, '2026-06-01T02:00:00.000Z')
  assert.equal(drifted.proofState, 'DRIFTED')
  const protectedProof = proofFromDrift('tenant-a3-proj2', { outcomeId: 'outcome-1', driftEventId: 'drift-closed', status: 'RESOLVED', protectedMonthlySavings: 75 }, '2026-06-01T03:00:00.000Z')
  assert.equal(protectedProof.proofState, 'PROTECTED')
  assert.equal(protectedProof.evidenceSummary.hasDriftProtectionEvidence, true)
})
