import { outcomeProjectionService } from './outcome-projection-service'
import { outcomeProofService } from './outcome-proof-service'
import type { OutcomeProof } from './outcome-proof-types'

function proofToLedgerRow(proof: OutcomeProof, index: number) {
  const state = proof.proofState
  const verifiedSaving = proof.verifiedMonthlySavings || (state === 'VERIFIED' ? proof.projectedMonthlySavings : 0)
  return {
    id: Number(String(proof.outcomeId).replace(/\D/g, '').slice(-9)) || index + 1,
    outcomeId: proof.outcomeId,
    tenantId: proof.tenantId,
    recommendationId: Number(String(proof.recommendationId ?? '').replace(/\D/g, '')) || 0,
    approvalWorkflowId: proof.approvalWorkflowId,
    executionRequestId: proof.executionRequestId,
    executionResultId: proof.executionResultId,
    userEmail: proof.team ?? '',
    displayName: proof.vendor ?? proof.sourcePlaybook ?? 'Outcome proof',
    action: proof.sourcePlaybook ?? proof.domain ?? 'Outcome proof',
    licenceSku: proof.domain ?? '',
    monthlySaving: proof.projectedMonthlySavings,
    annualisedSaving: proof.projectedAnnualSavings,
    approved: proof.evidenceSummary.hasApprovalEvidence || ['APPROVED', 'EXECUTED', 'VERIFIED', 'RETAINED', 'PROTECTED', 'DRIFTED', 'CLOSED'].includes(state),
    executed: proof.evidenceSummary.hasExecutionEvidence || ['EXECUTED', 'VERIFIED', 'RETAINED', 'PROTECTED', 'DRIFTED', 'CLOSED'].includes(state),
    executionMode: 'CANONICAL_OUTCOME_PROOF',
    playbookId: proof.sourcePlaybook ?? '',
    playbookName: proof.sourcePlaybook ?? '',
    evidence: { sourceOfTruth: 'OUTCOME_PROOF_AUTHORITY', proofState: state, verificationState: state === 'FAILED' ? 'FAILED' : state === 'VERIFIED' ? 'VERIFIED' : 'PENDING_VERIFICATION', verifiedSaving, outcomeId: proof.outcomeId, evidenceSummary: proof.evidenceSummary, proofTimeline: proof.proofTimeline },
    pricingConfidence: proof.confidenceBand,
    pricingSource: 'Outcome Proof Authority',
    savingConfidence: proof.confidenceBand,
    actorId: proof.proofTimeline.at(-1)?.actorId ?? 'system',
    executionStatus: state,
    approvedAt: proof.proofTimeline.find((event) => event.stage === 'APPROVED')?.occurredAt ? new Date(proof.proofTimeline.find((event) => event.stage === 'APPROVED')!.occurredAt) : null,
    executedAt: proof.proofTimeline.find((event) => event.stage === 'EXECUTED')?.occurredAt ? new Date(proof.proofTimeline.find((event) => event.stage === 'EXECUTED')!.occurredAt) : null,
    createdAt: new Date(proof.createdAt),
    updatedAt: proof.updatedAt,
    proof,
  }
}

// Compatibility projection: legacy outcome ledger callers now read from the canonical Outcome Proof Authority.
export async function listOutcomeLedger(tenantId: string, limit = 200) {
  const proofs = await outcomeProofService.listProofs(tenantId, { limit })
  return proofs.map(proofToLedgerRow)
}

export async function outcomeLedgerSummary(tenantId: string) {
  const summary = await outcomeProofService.getSummary(tenantId)
  const projected = outcomeProjectionService.commandMetrics(tenantId)
  return {
    ...summary,
    projected: summary.projectedMonthlySavings,
    verified: summary.verifiedMonthlySavings,
    pending: summary.verificationBacklogCount,
    failed: summary.verificationFailedCount,
    activeDrift: summary.driftedOutcomeCount,
    totalProjectedSavings: summary.projectedMonthlySavings,
    totalVerifiedSavings: summary.verifiedMonthlySavings,
    pendingVerificationCount: summary.verificationBacklogCount,
    failedVerificationCount: summary.verificationFailedCount,
    projectedValuePendingProof: (projected as any).projectedValuePendingProof ?? 0,
  }
}

export async function outcomeLedgerByPlaybook(tenantId: string) {
  const proofs = await outcomeProofService.listProofs(tenantId, { limit: 500 })
  const out = new Map<string, any>()
  for (const proof of proofs) {
    const k = String(proof.sourcePlaybook || proof.domain || 'UNKNOWN')
    const curr = out.get(k) ?? { playbook: k, outcomes: 0, projectedMonthlySavings: 0, approvedMonthlySavings: 0, executedMonthlySavings: 0, verifiedMonthlySavings: 0, retainedMonthlySavings: 0, protectedMonthlySavings: 0 }
    curr.outcomes += 1
    curr.projectedMonthlySavings += proof.projectedMonthlySavings
    curr.approvedMonthlySavings += proof.approvedMonthlySavings
    curr.executedMonthlySavings += proof.executedMonthlySavings
    curr.verifiedMonthlySavings += proof.verifiedMonthlySavings
    curr.retainedMonthlySavings += proof.retainedMonthlySavings
    curr.protectedMonthlySavings += proof.protectedMonthlySavings
    out.set(k, curr)
  }
  return [...out.values()]
}

export async function outcomeLedgerByState(tenantId: string) {
  const proofs = await outcomeProofService.listProofs(tenantId, { limit: 500 })
  const out = new Map<string, number>()
  for (const proof of proofs) out.set(proof.proofState, (out.get(proof.proofState) ?? 0) + 1)
  return [...out.entries()].map(([state, count]) => ({ state, count }))
}
