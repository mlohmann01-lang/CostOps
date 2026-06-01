import type { OutcomeConfidenceBand, OutcomeEvidenceSummary, OutcomeProof, OutcomeProofInput, OutcomeProofState, OutcomeProofTimelineEvent } from './outcome-proof-types'

const stateRank: Record<OutcomeProofState, number> = { PROJECTED: 1, APPROVED: 2, EXECUTED: 3, VERIFIED: 4, RETAINED: 5, PROTECTED: 6, DRIFTED: 7, FAILED: 8, CLOSED: 9 }

export function emptyEvidenceSummary(): OutcomeEvidenceSummary {
  return { hasProjectionEvidence: false, hasApprovalEvidence: false, hasExecutionEvidence: false, hasVerificationEvidence: false, hasRetentionEvidence: false, hasDriftProtectionEvidence: false }
}

export function stageRank(state: OutcomeProofState) { return stateRank[state] ?? 0 }

export function confidenceBand(input: unknown): OutcomeConfidenceBand {
  const value = String(input ?? '').toUpperCase()
  if (value.includes('FAILED') || value.includes('DISPUTED')) return 'FAILED'
  if (value.includes('HIGH') || value.includes('VERIFIED')) return 'HIGH'
  if (value.includes('MEDIUM') || value.includes('PARTIAL')) return 'MEDIUM'
  return 'LOW'
}

export function stateFromVerification(status: unknown): OutcomeProofState {
  const value = String(status ?? '').toUpperCase()
  if (value.includes('FAILED')) return 'FAILED'
  if (value.includes('DRIFT')) return 'DRIFTED'
  if (value.includes('PROTECTED')) return 'PROTECTED'
  if (value.includes('VERIFIED')) return 'VERIFIED'
  if (value.includes('PARTIAL')) return 'EXECUTED'
  return 'EXECUTED'
}

export function deterministicOutcomeId(tenantId: string, input: OutcomeProofInput) {
  const key = input.outcomeId ?? input.executionRequestId ?? input.executionResultId ?? input.recommendationId ?? input.opportunityId ?? input.verificationId ?? 'unknown'
  const kind = input.outcomeId ? 'outcome' : input.executionRequestId ? 'execution-request' : input.executionResultId ? 'execution-result' : input.recommendationId ? 'recommendation' : input.opportunityId ? 'opportunity' : input.verificationId ? 'verification' : 'proof'
  return `${tenantId}:${kind}:${key}`.replace(/[^A-Za-z0-9:_-]/g, '_')
}

function timeline(stage: OutcomeProofState, sourceSystem: string, evidenceRef: string | undefined, occurredAt: string, eventId?: string, actorId?: string): OutcomeProofTimelineEvent[] {
  return [{ stage, sourceSystem, evidenceRef, occurredAt, eventId, actorId }]
}

export function buildBaseProof(tenantId: string, input: OutcomeProofInput, now = new Date().toISOString()): OutcomeProof {
  const projectedMonthly = Number(input.projectedMonthlySavings ?? 0)
  const approvedMonthly = Number(input.approvedMonthlySavings ?? 0)
  const executedMonthly = Number(input.executedMonthlySavings ?? 0)
  const verifiedMonthly = Number(input.verifiedMonthlySavings ?? 0)
  const retainedMonthly = Number(input.retainedMonthlySavings ?? 0)
  const protectedMonthly = Number(input.protectedMonthlySavings ?? 0)
  const proofState = input.proofState ?? 'PROJECTED'
  return {
    outcomeId: input.outcomeId ?? deterministicOutcomeId(tenantId, input),
    tenantId,
    opportunityId: input.opportunityId,
    recommendationId: input.recommendationId,
    approvalId: input.approvalId,
    approvalWorkflowId: input.approvalWorkflowId,
    executionRequestId: input.executionRequestId,
    executionResultId: input.executionResultId,
    verificationId: input.verificationId,
    driftEventId: input.driftEventId,
    sourcePlaybook: input.sourcePlaybook,
    domain: input.domain,
    vendor: input.vendor,
    team: input.team,
    costCentre: input.costCentre,
    projectedMonthlySavings: projectedMonthly,
    projectedAnnualSavings: Number(input.projectedAnnualSavings ?? projectedMonthly * 12),
    approvedMonthlySavings: approvedMonthly,
    approvedAnnualSavings: Number(input.approvedAnnualSavings ?? approvedMonthly * 12),
    executedMonthlySavings: executedMonthly,
    executedAnnualSavings: Number(input.executedAnnualSavings ?? executedMonthly * 12),
    verifiedMonthlySavings: verifiedMonthly,
    verifiedAnnualSavings: Number(input.verifiedAnnualSavings ?? verifiedMonthly * 12),
    retainedMonthlySavings: retainedMonthly,
    retainedAnnualSavings: Number(input.retainedAnnualSavings ?? retainedMonthly * 12),
    protectedMonthlySavings: protectedMonthly,
    protectedAnnualSavings: Number(input.protectedAnnualSavings ?? protectedMonthly * 12),
    savingsVarianceMonthly: Number(input.savingsVarianceMonthly ?? verifiedMonthly - projectedMonthly),
    savingsVarianceAnnual: Number(input.savingsVarianceAnnual ?? (verifiedMonthly - projectedMonthly) * 12),
    proofState,
    confidenceBand: input.confidenceBand ?? 'LOW',
    evidencePackId: input.evidencePackId,
    evidenceSummary: { ...emptyEvidenceSummary(), ...(input.evidenceSummary ?? {}) },
    proofTimeline: input.proofTimeline ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  }
}

function nonEmpty<T>(incoming: T | undefined, existing: T | undefined) { return incoming === undefined || incoming === null || incoming === '' ? existing : incoming }
function money(incoming: number, existing: number) { return incoming === 0 ? existing : incoming }

export function mergeProofs(existing: OutcomeProof | undefined, incoming: OutcomeProof): OutcomeProof {
  if (!existing) return incoming
  const state = stageRank(incoming.proofState) >= stageRank(existing.proofState) || incoming.proofState === 'DRIFTED' || incoming.proofState === 'FAILED' ? incoming.proofState : existing.proofState
  const seen = new Set<string>()
  const proofTimeline = [...existing.proofTimeline, ...incoming.proofTimeline].filter((event) => {
    const key = `${event.stage}:${event.eventId ?? ''}:${event.sourceSystem}:${event.evidenceRef ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
  const verifiedMonthly = money(incoming.verifiedMonthlySavings, existing.verifiedMonthlySavings)
  const projectedMonthly = money(incoming.projectedMonthlySavings, existing.projectedMonthlySavings)
  const varianceMonthly = verifiedMonthly - projectedMonthly
  return {
    ...existing,
    ...incoming,
    outcomeId: existing.outcomeId,
    tenantId: existing.tenantId,
    opportunityId: nonEmpty(incoming.opportunityId, existing.opportunityId),
    recommendationId: nonEmpty(incoming.recommendationId, existing.recommendationId),
    approvalId: nonEmpty(incoming.approvalId, existing.approvalId),
    approvalWorkflowId: nonEmpty(incoming.approvalWorkflowId, existing.approvalWorkflowId),
    executionRequestId: nonEmpty(incoming.executionRequestId, existing.executionRequestId),
    executionResultId: nonEmpty(incoming.executionResultId, existing.executionResultId),
    verificationId: nonEmpty(incoming.verificationId, existing.verificationId),
    driftEventId: nonEmpty(incoming.driftEventId, existing.driftEventId),
    sourcePlaybook: nonEmpty(incoming.sourcePlaybook, existing.sourcePlaybook),
    domain: nonEmpty(incoming.domain, existing.domain),
    vendor: nonEmpty(incoming.vendor, existing.vendor),
    team: nonEmpty(incoming.team, existing.team),
    costCentre: nonEmpty(incoming.costCentre, existing.costCentre),
    projectedMonthlySavings: projectedMonthly,
    projectedAnnualSavings: projectedMonthly * 12,
    approvedMonthlySavings: money(incoming.approvedMonthlySavings, existing.approvedMonthlySavings),
    approvedAnnualSavings: money(incoming.approvedAnnualSavings, existing.approvedAnnualSavings),
    executedMonthlySavings: money(incoming.executedMonthlySavings, existing.executedMonthlySavings),
    executedAnnualSavings: money(incoming.executedAnnualSavings, existing.executedAnnualSavings),
    verifiedMonthlySavings: verifiedMonthly,
    verifiedAnnualSavings: verifiedMonthly * 12,
    retainedMonthlySavings: money(incoming.retainedMonthlySavings, existing.retainedMonthlySavings),
    retainedAnnualSavings: money(incoming.retainedAnnualSavings, existing.retainedAnnualSavings),
    protectedMonthlySavings: money(incoming.protectedMonthlySavings, existing.protectedMonthlySavings),
    protectedAnnualSavings: money(incoming.protectedAnnualSavings, existing.protectedAnnualSavings),
    savingsVarianceMonthly: varianceMonthly,
    savingsVarianceAnnual: varianceMonthly * 12,
    proofState: state,
    confidenceBand: incoming.confidenceBand === 'LOW' && existing.confidenceBand !== 'LOW' ? existing.confidenceBand : incoming.confidenceBand,
    evidencePackId: nonEmpty(incoming.evidencePackId, existing.evidencePackId),
    evidenceSummary: { ...existing.evidenceSummary, ...Object.fromEntries(Object.entries(incoming.evidenceSummary).map(([k, v]) => [k, Boolean(v) || Boolean((existing.evidenceSummary as any)[k])])) } as OutcomeEvidenceSummary,
    proofTimeline,
    createdAt: existing.createdAt,
    updatedAt: incoming.updatedAt,
  }
}

export function proofFromRecommendation(tenantId: string, recommendation: any, now = new Date().toISOString()) {
  const monthly = Number(recommendation.projectedMonthlySavings ?? recommendation.monthlySaving ?? recommendation.saving ?? 0)
  return buildBaseProof(tenantId, { recommendationId: String(recommendation.recommendationId ?? recommendation.id), opportunityId: recommendation.opportunityId ? String(recommendation.opportunityId) : undefined, sourcePlaybook: recommendation.playbookId ?? recommendation.actionType, domain: recommendation.domain, vendor: recommendation.vendor, team: recommendation.team, costCentre: recommendation.costCentre, projectedMonthlySavings: monthly, projectedAnnualSavings: Number(recommendation.projectedAnnualSavings ?? monthly * 12), proofState: 'PROJECTED', confidenceBand: confidenceBand(recommendation.savingsConfidence ?? recommendation.confidenceScore), evidenceSummary: { hasProjectionEvidence: true }, proofTimeline: timeline('PROJECTED', 'RECOMMENDATION', `recommendation:${recommendation.recommendationId ?? recommendation.id}`, now, undefined, recommendation.actorId) }, now)
}

export function proofFromApproval(tenantId: string, approval: any, now = new Date().toISOString()) {
  const monthly = Number(approval.approvedMonthlySavings ?? approval.projectedMonthlySavings ?? approval.monthlySaving ?? 0)
  return buildBaseProof(tenantId, { recommendationId: approval.recommendationId ? String(approval.recommendationId) : approval.targetType === 'RECOMMENDATION' ? String(approval.targetId) : undefined, opportunityId: approval.opportunityId ? String(approval.opportunityId) : approval.targetType === 'OPPORTUNITY' ? String(approval.targetId) : undefined, approvalId: approval.approvalId, approvalWorkflowId: approval.workflowId ?? approval.approvalWorkflowId, approvedMonthlySavings: monthly, approvedAnnualSavings: Number(approval.approvedAnnualSavings ?? approval.projectedAnnualSavings ?? monthly * 12), projectedMonthlySavings: Number(approval.projectedMonthlySavings ?? monthly), projectedAnnualSavings: Number(approval.projectedAnnualSavings ?? monthly * 12), proofState: 'APPROVED', confidenceBand: 'MEDIUM', evidenceSummary: { hasApprovalEvidence: true }, proofTimeline: timeline('APPROVED', 'APPROVAL_WORKFLOW', `approval-workflow:${approval.workflowId ?? approval.approvalWorkflowId ?? approval.approvalId}`, approval.decidedAt ?? approval.updatedAt ?? now, undefined, approval.actorId) }, now)
}

export function proofFromExecutionResult(tenantId: string, executionResult: any, now = new Date().toISOString()) {
  const monthly = Number(executionResult.executedMonthlySavings ?? executionResult.projectedMonthlySavings ?? executionResult.monthlySaving ?? 0)
  return buildBaseProof(tenantId, { recommendationId: executionResult.recommendationId ? String(executionResult.recommendationId) : undefined, executionRequestId: executionResult.executionRequestId ? String(executionResult.executionRequestId) : undefined, executionResultId: String(executionResult.executionResultId ?? executionResult.id), projectedMonthlySavings: Number(executionResult.projectedMonthlySavings ?? monthly), projectedAnnualSavings: Number(executionResult.projectedAnnualSavings ?? monthly * 12), executedMonthlySavings: monthly, executedAnnualSavings: Number(executionResult.executedAnnualSavings ?? monthly * 12), proofState: 'EXECUTED', confidenceBand: 'MEDIUM', evidenceSummary: { hasExecutionEvidence: true }, proofTimeline: timeline('EXECUTED', 'EXECUTION_RESULT', `execution-result:${executionResult.executionResultId ?? executionResult.id}`, executionResult.completedAt ?? executionResult.updatedAt ?? now, undefined, executionResult.executedBy ?? executionResult.actorId) }, now)
}

export function proofFromVerification(tenantId: string, verification: any, now = new Date().toISOString()) {
  const projected = Number(verification.projectedMonthlySavings ?? verification.projectedMonthlySaving ?? 0)
  const verified = Number(verification.verifiedMonthlySavings ?? verification.verifiedMonthlySaving ?? 0)
  const state = stateFromVerification(verification.verificationState ?? verification.verificationStatus)
  return buildBaseProof(tenantId, { outcomeId: verification.outcomeId, recommendationId: verification.recommendationId ? String(verification.recommendationId) : undefined, executionRequestId: verification.executionRequestId, executionResultId: verification.executionResultId, verificationId: verification.verificationId ?? verification.id ? String(verification.verificationId ?? verification.id) : undefined, projectedMonthlySavings: projected, projectedAnnualSavings: Number(verification.projectedAnnualSavings ?? projected * 12), executedMonthlySavings: Number(verification.executedMonthlySavings ?? projected), executedAnnualSavings: Number(verification.executedAnnualSavings ?? projected * 12), verifiedMonthlySavings: verified, verifiedAnnualSavings: Number(verification.verifiedAnnualSavings ?? verified * 12), savingsVarianceMonthly: Number(verification.savingsVariance ?? verification.varianceAmount ?? verified - projected), savingsVarianceAnnual: Number(verification.savingsVarianceAnnual ?? (Number(verification.savingsVariance ?? verification.varianceAmount ?? verified - projected) * 12)), proofState: state, confidenceBand: state === 'FAILED' ? 'FAILED' : confidenceBand(verification.verificationConfidence ?? verification.confidenceBand), evidencePackId: verification.evidencePackId ?? (verification.outcomeId ? `evidence:${verification.outcomeId}` : undefined), evidenceSummary: { hasExecutionEvidence: Boolean(verification.executionResultId), hasVerificationEvidence: true }, proofTimeline: timeline(state, 'OUTCOME_VERIFICATION', `verification:${verification.verificationId ?? verification.id ?? verification.outcomeId}`, verification.verifiedAt ?? verification.createdAt ?? now, undefined, verification.actorId) }, now)
}

export function proofFromDrift(tenantId: string, driftEvent: any, now = new Date().toISOString()) {
  const protectedMonthly = Number(driftEvent.protectedMonthlySavings ?? driftEvent.valueProtected ?? 0)
  const drifted = String(driftEvent.status ?? driftEvent.driftState ?? '').toUpperCase().includes('RESOLVED') || protectedMonthly > 0
  return buildBaseProof(tenantId, { outcomeId: driftEvent.outcomeId, recommendationId: driftEvent.recommendationId, executionRequestId: driftEvent.executionRequestId, driftEventId: String(driftEvent.driftEventId ?? driftEvent.id), protectedMonthlySavings: protectedMonthly, protectedAnnualSavings: Number(driftEvent.protectedAnnualSavings ?? protectedMonthly * 12), proofState: drifted ? 'PROTECTED' : 'DRIFTED', confidenceBand: drifted ? 'HIGH' : 'LOW', evidenceSummary: { hasDriftProtectionEvidence: true }, proofTimeline: timeline(drifted ? 'PROTECTED' : 'DRIFTED', 'DRIFT_MONITOR', `drift:${driftEvent.driftEventId ?? driftEvent.id}`, driftEvent.detectedAt ?? driftEvent.resolvedAt ?? now, undefined, driftEvent.actorId) }, now)
}

export function proofFromLedgerRow(tenantId: string, row: any, now = new Date().toISOString()) {
  const verificationState = String(row?.evidence?.verificationState ?? row.executionStatus ?? '').toUpperCase()
  const verified = Number(row?.evidence?.verifiedSaving ?? (verificationState.includes('VERIFIED') ? row.monthlySaving : 0) ?? 0)
  const state: OutcomeProofState = verificationState.includes('FAILED') ? 'FAILED' : verificationState.includes('VERIFIED') ? 'VERIFIED' : row.executed ? 'EXECUTED' : row.approved ? 'APPROVED' : 'PROJECTED'
  return buildBaseProof(tenantId, { outcomeId: String(row?.evidence?.outcomeId ?? row.id), recommendationId: String(row.recommendationId), executionResultId: row.executionResultId, sourcePlaybook: row.playbookId || row.action, projectedMonthlySavings: Number(row.monthlySaving ?? 0), projectedAnnualSavings: Number(row.annualisedSaving ?? Number(row.monthlySaving ?? 0) * 12), approvedMonthlySavings: row.approved ? Number(row.monthlySaving ?? 0) : 0, approvedAnnualSavings: row.approved ? Number(row.annualisedSaving ?? 0) : 0, executedMonthlySavings: row.executed ? Number(row.monthlySaving ?? 0) : 0, executedAnnualSavings: row.executed ? Number(row.annualisedSaving ?? 0) : 0, verifiedMonthlySavings: verified, verifiedAnnualSavings: verified * 12, proofState: state, confidenceBand: confidenceBand(row.savingConfidence ?? row.pricingConfidence), evidencePackId: `ledger:${row.id}`, evidenceSummary: { hasProjectionEvidence: true, hasApprovalEvidence: Boolean(row.approved), hasExecutionEvidence: Boolean(row.executed), hasVerificationEvidence: verificationState.includes('VERIFIED') || verificationState.includes('FAILED') }, proofTimeline: timeline(state, 'OUTCOME_LEDGER_COMPATIBILITY', `outcome-ledger:${row.id}`, (row.executedAt ?? row.approvedAt ?? row.createdAt ?? now).toISOString?.() ?? String(row.executedAt ?? row.approvedAt ?? row.createdAt ?? now), undefined, row.actorId) }, now)
}
