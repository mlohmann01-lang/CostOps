export type OutcomeProofState = 'PROJECTED' | 'APPROVED' | 'EXECUTED' | 'VERIFIED' | 'RETAINED' | 'PROTECTED' | 'DRIFTED' | 'FAILED' | 'CLOSED'
export type OutcomeConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'FAILED'

export interface OutcomeEvidenceSummary {
  hasProjectionEvidence: boolean
  hasApprovalEvidence: boolean
  hasExecutionEvidence: boolean
  hasVerificationEvidence: boolean
  hasRetentionEvidence: boolean
  hasDriftProtectionEvidence: boolean
}

export interface OutcomeProofTimelineEvent {
  stage: string
  eventId?: string
  occurredAt: string
  actorId?: string
  sourceSystem: string
  evidenceRef?: string
}

export interface OutcomeProof {
  outcomeId: string
  tenantId: string

  opportunityId?: string
  recommendationId?: string
  approvalId?: string
  approvalWorkflowId?: string
  executionRequestId?: string
  executionResultId?: string
  verificationId?: string
  driftEventId?: string

  sourcePlaybook?: string
  domain?: string
  vendor?: string
  team?: string
  costCentre?: string

  projectedMonthlySavings: number
  projectedAnnualSavings: number
  approvedMonthlySavings: number
  approvedAnnualSavings: number
  executedMonthlySavings: number
  executedAnnualSavings: number
  verifiedMonthlySavings: number
  verifiedAnnualSavings: number
  retainedMonthlySavings: number
  retainedAnnualSavings: number
  protectedMonthlySavings: number
  protectedAnnualSavings: number
  savingsVarianceMonthly: number
  savingsVarianceAnnual: number

  proofState: OutcomeProofState
  confidenceBand: OutcomeConfidenceBand
  evidencePackId?: string
  evidenceSummary: OutcomeEvidenceSummary
  proofTimeline: OutcomeProofTimelineEvent[]
  createdAt: string
  updatedAt: string
}

export interface OutcomeProofSummary {
  tenantId: string
  projectedMonthlySavings: number
  approvedMonthlySavings: number
  executedMonthlySavings: number
  verifiedMonthlySavings: number
  retainedMonthlySavings: number
  protectedMonthlySavings: number
  projectedAnnualSavings: number
  approvedAnnualSavings: number
  executedAnnualSavings: number
  verifiedAnnualSavings: number
  retainedAnnualSavings: number
  protectedAnnualSavings: number
  verificationBacklogCount: number
  verificationFailedCount: number
  driftedOutcomeCount: number
  averageConfidenceBand: OutcomeConfidenceBand
  generatedAt: string
}

export interface OutcomeProofFilters {
  proofState?: OutcomeProofState
  recommendationId?: string
  opportunityId?: string
  executionRequestId?: string
  executionResultId?: string
  verificationId?: string
  limit?: number
}

export type OutcomeProofInput = Partial<Omit<OutcomeProof, 'tenantId' | 'createdAt' | 'updatedAt' | 'proofTimeline' | 'evidenceSummary'>> & {
  outcomeId?: string
  proofTimeline?: OutcomeProofTimelineEvent[]
  evidenceSummary?: Partial<OutcomeEvidenceSummary>
  createdAt?: string
  updatedAt?: string
}
