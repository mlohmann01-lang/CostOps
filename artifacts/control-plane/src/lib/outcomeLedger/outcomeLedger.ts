// ─── Canonical Outcome Ledger Schema ─────────────────────────────────────────
// Financial chain of custody for technology value.
// Each stage carries its own value position — values never overwrite each other.

export type OutcomeLifecycleStage =
  | 'PROJECTED'
  | 'APPROVED'
  | 'EXECUTED'
  | 'VERIFIED'
  | 'FINANCE_CONFIRMED'
  | 'PROTECTED'
  | 'FAILED'
  | 'DRIFTED'

export type OutcomeType =
  | 'COST_REDUCTION'
  | 'COST_AVOIDANCE'
  | 'RISK_REDUCTION'
  | 'PRODUCTIVITY'
  | 'CONSOLIDATION'
  | 'GOVERNANCE_CONTROL'

export type OutcomeSourceDomain =
  | 'M365'
  | 'AI'
  | 'SAAS'
  | 'CLOUD'
  | 'ITAM'
  | 'SERVICENOW'
  | 'FINANCE'
  | 'MANUAL'

export interface OutcomeRecord {
  id: string
  tenantId: string

  name: string
  description?: string

  sourceDomain: OutcomeSourceDomain
  outcomeType: OutcomeType

  lifecycleStage: OutcomeLifecycleStage
  proofState: OutcomeLifecycleStage

  ownerId?: string
  ownerName?: string
  costCentre?: string
  businessUnit?: string

  projectedValue: number
  approvedValue?: number
  executedValue?: number
  verifiedValue?: number
  financeConfirmedValue?: number
  protectedValue?: number

  approvalLeakage?: number
  executionLeakage?: number
  verificationLeakage?: number
  financeLeakage?: number
  driftLeakage?: number
  totalValueLeakage?: number

  leakageReason?: string
  varianceNarrative?: string

  confidenceScore?: number
  evidenceCoverage?: number

  approvalEvidenceIds: string[]
  executionEvidenceIds: string[]
  verificationEvidenceIds: string[]
  financeEvidenceIds: string[]
  protectionEvidenceIds: string[]

  createdAt: string
  updatedAt: string
  stageChangedAt?: string
}

// ─── Ledger Event (immutable, append-only) ────────────────────────────────────

export type OutcomeLedgerEventType =
  | 'OUTCOME_PROJECTED'
  | 'OUTCOME_APPROVED'
  | 'ACTION_EXECUTED'
  | 'OUTCOME_VERIFIED'
  | 'FINANCE_CONFIRMED'
  | 'VALUE_PROTECTED'
  | 'VALUE_DRIFTED'
  | 'OUTCOME_FAILED'
  | 'VALUE_ADJUSTED'
  | 'EVIDENCE_ATTACHED'

export interface OutcomeLedgerEvent {
  readonly id: string
  readonly tenantId: string
  readonly outcomeId: string

  readonly eventType: OutcomeLedgerEventType
  readonly fromStage?: OutcomeLifecycleStage
  readonly toStage?: OutcomeLifecycleStage

  readonly valueBefore?: number
  readonly valueAfter?: number
  readonly valueDelta?: number

  readonly evidenceIds: readonly string[]
  readonly actorId?: string
  readonly actorName?: string

  readonly reason?: string
  readonly createdAt: string
}

// ─── Leakage Calculation ──────────────────────────────────────────────────────

export interface OutcomeLeakage {
  approvalLeakage: number
  executionLeakage: number
  verificationLeakage: number
  financeLeakage: number
  driftLeakage: number
  totalValueLeakage: number
}

export function calculateOutcomeLeakage(outcome: OutcomeRecord): OutcomeLeakage {
  const projected = outcome.projectedValue ?? 0
  const approved = outcome.approvedValue ?? projected
  const executed = outcome.executedValue ?? approved
  const verified = outcome.verifiedValue ?? executed
  const finance = outcome.financeConfirmedValue ?? verified
  const protectedValue = outcome.protectedValue ?? finance

  return {
    approvalLeakage: projected - approved,
    executionLeakage: approved - executed,
    verificationLeakage: executed - verified,
    financeLeakage: verified - finance,
    driftLeakage: finance - protectedValue,
    totalValueLeakage: projected - protectedValue,
  }
}

// ─── Transition Guards ────────────────────────────────────────────────────────

export interface TransitionData {
  ownerId?: string
  approvalReason?: string
  approvalEvidenceIds?: string[]
  approvedValue?: number
  governedActionId?: string
  executionEvidenceIds?: string[]
  executedValue?: number
  verificationEvidenceIds?: string[]
  verifiedValue?: number
  financeEvidenceIds?: string[]
  financeConfirmedValue?: number
  protectionEvidenceIds?: string[]
  protectedValue?: number
  failedReason?: string
}

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; reason: string }

export function validateOutcomeTransition(
  from: OutcomeLifecycleStage,
  to: OutcomeLifecycleStage,
  data: TransitionData,
): TransitionResult {
  if (from === 'PROJECTED' && to === 'APPROVED') {
    if (!data.ownerId) return { allowed: false, reason: 'Owner is required for approval.' }
    if (!data.approvalReason) return { allowed: false, reason: 'Approval reason is required.' }
    if (!data.approvalEvidenceIds?.length) return { allowed: false, reason: 'At least one approval evidence ID is required.' }
    if (data.approvedValue === undefined) return { allowed: false, reason: 'Approved value is required.' }
    return { allowed: true }
  }

  if (from === 'APPROVED' && to === 'EXECUTED') {
    if (!data.executionEvidenceIds?.length) return { allowed: false, reason: 'Execution evidence is required.' }
    if (data.executedValue === undefined) return { allowed: false, reason: 'Executed value is required.' }
    return { allowed: true }
  }

  if (from === 'EXECUTED' && to === 'VERIFIED') {
    if (!data.verificationEvidenceIds?.length) return { allowed: false, reason: 'Post-action measurement evidence is required.' }
    if (data.verifiedValue === undefined) return { allowed: false, reason: 'Verified value is required.' }
    return { allowed: true }
  }

  if (from === 'VERIFIED' && to === 'FINANCE_CONFIRMED') {
    if (!data.financeEvidenceIds?.length) return { allowed: false, reason: 'Finance reconciliation evidence is required.' }
    if (data.financeConfirmedValue === undefined) return { allowed: false, reason: 'Finance confirmed value is required.' }
    return { allowed: true }
  }

  if (from === 'FINANCE_CONFIRMED' && to === 'PROTECTED') {
    if (!data.protectionEvidenceIds?.length) return { allowed: false, reason: 'Drift monitor or retention evidence is required.' }
    if (data.protectedValue === undefined) return { allowed: false, reason: 'Protected value is required.' }
    return { allowed: true }
  }

  if (to === 'FAILED' || to === 'DRIFTED') {
    if (!data.failedReason) return { allowed: false, reason: 'Failure or drift reason is required.' }
    return { allowed: true }
  }

  return { allowed: false, reason: `No valid transition path from ${from} to ${to}.` }
}

// ─── Summary Aggregation ──────────────────────────────────────────────────────

export interface OutcomeLedgerSummary {
  totalProjectedValue: number
  totalApprovedValue: number
  totalExecutedValue: number
  totalVerifiedValue: number
  totalFinanceConfirmedValue: number
  totalProtectedValue: number

  totalApprovalLeakage: number
  totalExecutionLeakage: number
  totalVerificationLeakage: number
  totalFinanceLeakage: number
  totalDriftLeakage: number
  totalValueLeakage: number

  outcomeCount: number
  verifiedOutcomeCount: number
  financeConfirmedOutcomeCount: number
  protectedOutcomeCount: number
  failedOutcomeCount: number
  driftedOutcomeCount: number

  verificationBacklogCount: number
  financeBacklogCount: number
  protectionBacklogCount: number
}

export function buildOutcomeLedgerSummary(outcomes: OutcomeRecord[]): OutcomeLedgerSummary {
  let totalProjectedValue = 0
  let totalApprovedValue = 0
  let totalExecutedValue = 0
  let totalVerifiedValue = 0
  let totalFinanceConfirmedValue = 0
  let totalProtectedValue = 0
  let totalApprovalLeakage = 0
  let totalExecutionLeakage = 0
  let totalVerificationLeakage = 0
  let totalFinanceLeakage = 0
  let totalDriftLeakage = 0
  let totalValueLeakage = 0
  let verifiedOutcomeCount = 0
  let financeConfirmedOutcomeCount = 0
  let protectedOutcomeCount = 0
  let failedOutcomeCount = 0
  let driftedOutcomeCount = 0
  let verificationBacklogCount = 0
  let financeBacklogCount = 0
  let protectionBacklogCount = 0

  for (const outcome of outcomes) {
    const leakage = calculateOutcomeLeakage(outcome)

    totalProjectedValue += outcome.projectedValue
    // Only count stage-specific values when the stage has been reached
    if (outcome.approvedValue !== undefined) totalApprovedValue += outcome.approvedValue
    if (outcome.executedValue !== undefined) totalExecutedValue += outcome.executedValue
    if (outcome.verifiedValue !== undefined) totalVerifiedValue += outcome.verifiedValue
    if (outcome.financeConfirmedValue !== undefined) totalFinanceConfirmedValue += outcome.financeConfirmedValue
    if (outcome.protectedValue !== undefined) totalProtectedValue += outcome.protectedValue

    totalApprovalLeakage += leakage.approvalLeakage
    totalExecutionLeakage += leakage.executionLeakage
    totalVerificationLeakage += leakage.verificationLeakage
    totalFinanceLeakage += leakage.financeLeakage
    totalDriftLeakage += leakage.driftLeakage
    totalValueLeakage += leakage.totalValueLeakage

    const s = outcome.lifecycleStage
    if (s === 'VERIFIED' || s === 'FINANCE_CONFIRMED' || s === 'PROTECTED') verifiedOutcomeCount++
    if (s === 'FINANCE_CONFIRMED' || s === 'PROTECTED') financeConfirmedOutcomeCount++
    if (s === 'PROTECTED') protectedOutcomeCount++
    if (s === 'FAILED') failedOutcomeCount++
    if (s === 'DRIFTED') driftedOutcomeCount++
    if (s === 'EXECUTED') verificationBacklogCount++
    if (s === 'VERIFIED') financeBacklogCount++
    if (s === 'FINANCE_CONFIRMED') protectionBacklogCount++
  }

  return {
    totalProjectedValue,
    totalApprovedValue,
    totalExecutedValue,
    totalVerifiedValue,
    totalFinanceConfirmedValue,
    totalProtectedValue,
    totalApprovalLeakage,
    totalExecutionLeakage,
    totalVerificationLeakage,
    totalFinanceLeakage,
    totalDriftLeakage,
    totalValueLeakage,
    outcomeCount: outcomes.length,
    verifiedOutcomeCount,
    financeConfirmedOutcomeCount,
    protectedOutcomeCount,
    failedOutcomeCount,
    driftedOutcomeCount,
    verificationBacklogCount,
    financeBacklogCount,
    protectionBacklogCount,
  }
}

// ─── Proof Timeline ───────────────────────────────────────────────────────────

export interface ProofTimelineEntry {
  eventType: OutcomeLedgerEventType
  stage: OutcomeLifecycleStage | undefined
  valueDelta: number | undefined
  evidenceIds: readonly string[]
  actorName: string | undefined
  reason: string | undefined
  createdAt: string
}

export function buildOutcomeProofTimeline(
  outcome: OutcomeRecord,
  events: OutcomeLedgerEvent[],
): ProofTimelineEntry[] {
  return events
    .filter((e) => e.outcomeId === outcome.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((e) => ({
      eventType: e.eventType,
      stage: e.toStage,
      valueDelta: e.valueDelta,
      evidenceIds: e.evidenceIds,
      actorName: e.actorName,
      reason: e.reason,
      createdAt: e.createdAt,
    }))
}

// ─── Demo Records (lifecycle-stage/value consistency enforced) ────────────────
// RULE: only include value fields for stages that have been reached.
// PROTECTED → all six value fields may exist.
// VERIFIED → projected/approved/executed/verified may exist; finance+protected must not.
// PROJECTED → only projectedValue.

export const DEMO_OUTCOME_RECORDS: OutcomeRecord[] = [
  {
    id: 'demo-o1',
    tenantId: 'demo',
    name: 'Microsoft 365 Inactive Licence Reclaim',
    description: 'Reclaim unused M365 licences from inactive users across the tenant.',
    sourceDomain: 'M365',
    outcomeType: 'COST_REDUCTION',
    lifecycleStage: 'PROTECTED',
    proofState: 'PROTECTED',
    ownerId: 'user-1',
    ownerName: 'Sarah Chen',
    costCentre: 'IT-001',
    businessUnit: 'Technology',
    projectedValue: 76000,
    approvedValue: 76000,
    executedValue: 72000,
    verifiedValue: 70000,
    financeConfirmedValue: 68500,
    protectedValue: 68500,
    confidenceScore: 0.92,
    evidenceCoverage: 1.0,
    approvalEvidenceIds: ['ev-m365-approval'],
    executionEvidenceIds: ['ev-m365-exec'],
    verificationEvidenceIds: ['ev-m365-verify'],
    financeEvidenceIds: ['ev-m365-finance'],
    protectionEvidenceIds: ['ev-m365-protect'],
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-05-01T12:00:00Z',
    stageChangedAt: '2026-05-01T12:00:00Z',
  },
  {
    id: 'demo-o2',
    tenantId: 'demo',
    name: 'AI Tool Consolidation',
    description: 'Consolidate overlapping AI subscriptions into a single governed contract.',
    sourceDomain: 'AI',
    outcomeType: 'CONSOLIDATION',
    lifecycleStage: 'VERIFIED',
    proofState: 'VERIFIED',
    ownerId: 'user-2',
    ownerName: 'James Park',
    costCentre: 'INNOV-02',
    businessUnit: 'Innovation',
    projectedValue: 62000,
    approvedValue: 60000,
    executedValue: 58000,
    verifiedValue: 55000,
    // financeConfirmedValue and protectedValue intentionally absent — stage not yet reached
    confidenceScore: 0.85,
    evidenceCoverage: 0.8,
    approvalEvidenceIds: ['ev-ai-approval'],
    executionEvidenceIds: ['ev-ai-exec'],
    verificationEvidenceIds: ['ev-ai-verify'],
    financeEvidenceIds: [],
    protectionEvidenceIds: [],
    createdAt: '2026-02-03T10:00:00Z',
    updatedAt: '2026-05-15T14:30:00Z',
    stageChangedAt: '2026-05-15T14:30:00Z',
  },
  {
    id: 'demo-o3',
    tenantId: 'demo',
    name: 'Cloud Rightsizing',
    description: 'Right-size over-provisioned cloud instances identified in compute audit.',
    sourceDomain: 'CLOUD',
    outcomeType: 'COST_REDUCTION',
    lifecycleStage: 'APPROVED',
    proofState: 'APPROVED',
    ownerId: 'user-3',
    ownerName: 'David Liu',
    costCentre: 'INFRA-05',
    businessUnit: 'Infrastructure',
    projectedValue: 54000,
    approvedValue: 51000,
    // executedValue and later intentionally absent — not yet executed
    confidenceScore: 0.78,
    approvalEvidenceIds: ['ev-cloud-approval'],
    executionEvidenceIds: [],
    verificationEvidenceIds: [],
    financeEvidenceIds: [],
    protectionEvidenceIds: [],
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-04-10T11:00:00Z',
    stageChangedAt: '2026-04-10T11:00:00Z',
  },
  {
    id: 'demo-o4',
    tenantId: 'demo',
    name: 'SaaS Rationalisation',
    description: 'Eliminate duplicate SaaS subscriptions across departments.',
    sourceDomain: 'SAAS',
    outcomeType: 'COST_REDUCTION',
    lifecycleStage: 'PROJECTED',
    proofState: 'PROJECTED',
    projectedValue: 43000,
    // Only projectedValue — no downstream values until approved
    confidenceScore: 0.65,
    approvalEvidenceIds: [],
    executionEvidenceIds: [],
    verificationEvidenceIds: [],
    financeEvidenceIds: [],
    protectionEvidenceIds: [],
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-04-01T09:00:00Z',
  },
]

export const DEMO_LEDGER_EVENTS: OutcomeLedgerEvent[] = [
  {
    id: 'evt-1',
    tenantId: 'demo',
    outcomeId: 'demo-o1',
    eventType: 'OUTCOME_PROJECTED',
    toStage: 'PROJECTED',
    valueAfter: 76000,
    evidenceIds: [],
    actorName: 'System',
    createdAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 'evt-2',
    tenantId: 'demo',
    outcomeId: 'demo-o1',
    eventType: 'OUTCOME_APPROVED',
    fromStage: 'PROJECTED',
    toStage: 'APPROVED',
    valueBefore: 76000,
    valueAfter: 76000,
    valueDelta: 0,
    evidenceIds: ['ev-m365-approval'],
    actorName: 'Sarah Chen',
    reason: 'Business case approved by IT steering committee.',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: 'evt-3',
    tenantId: 'demo',
    outcomeId: 'demo-o1',
    eventType: 'ACTION_EXECUTED',
    fromStage: 'APPROVED',
    toStage: 'EXECUTED',
    valueBefore: 76000,
    valueAfter: 72000,
    valueDelta: -4000,
    evidenceIds: ['ev-m365-exec'],
    actorName: 'Certen Executor',
    reason: 'Four licences retained for pending off-boarding.',
    createdAt: '2026-02-15T14:00:00Z',
  },
  {
    id: 'evt-4',
    tenantId: 'demo',
    outcomeId: 'demo-o1',
    eventType: 'OUTCOME_VERIFIED',
    fromStage: 'EXECUTED',
    toStage: 'VERIFIED',
    valueBefore: 72000,
    valueAfter: 70000,
    valueDelta: -2000,
    evidenceIds: ['ev-m365-verify'],
    actorName: 'Sarah Chen',
    createdAt: '2026-03-10T09:30:00Z',
  },
  {
    id: 'evt-5',
    tenantId: 'demo',
    outcomeId: 'demo-o1',
    eventType: 'FINANCE_CONFIRMED',
    fromStage: 'VERIFIED',
    toStage: 'FINANCE_CONFIRMED',
    valueBefore: 70000,
    valueAfter: 68500,
    valueDelta: -1500,
    evidenceIds: ['ev-m365-finance'],
    actorName: 'Finance Team',
    reason: 'Minor currency rounding adjustment applied.',
    createdAt: '2026-04-05T11:00:00Z',
  },
  {
    id: 'evt-6',
    tenantId: 'demo',
    outcomeId: 'demo-o1',
    eventType: 'VALUE_PROTECTED',
    fromStage: 'FINANCE_CONFIRMED',
    toStage: 'PROTECTED',
    valueBefore: 68500,
    valueAfter: 68500,
    valueDelta: 0,
    evidenceIds: ['ev-m365-protect'],
    actorName: 'Drift Monitor',
    createdAt: '2026-05-01T12:00:00Z',
  },
]
