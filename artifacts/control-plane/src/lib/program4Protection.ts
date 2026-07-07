export const program4ProtectionQuestion = 'Which executed outcomes are verified, protected, drifting, at risk, or require rollback?'

export const protectionDecisions = ['VERIFIED', 'PROTECTED', 'DRIFTING', 'ROLLBACK_READY', 'ROLLBACK_REQUIRED', 'REVIEW', 'BLOCKED'] as const
export type ProtectionDecision = (typeof protectionDecisions)[number]
export type ProtectionEvidenceStatus = 'COMPLETE' | 'PARTIAL'

export type ProtectionOutcome = {
  id: string
  executedAction: string
  sourceSystem: string
  preState?: string
  postState?: string
  verificationResult?: 'PASSED' | 'FAILED' | 'PENDING' | 'MISSING'
  protectedOutcome?: string
  driftStatus?: 'NONE' | 'DRIFT_DETECTED' | 'HARMFUL_DRIFT' | 'UNKNOWN'
  rollbackStatus?: 'AVAILABLE' | 'READY' | 'REQUIRED' | 'NOT_AVAILABLE' | 'UNKNOWN'
  owner?: string
  timestamp?: string
  lineage?: string
  confidence?: number
  trustProofReference?: string
  protectedValue?: number
  trustEvidenceAvailable?: boolean
  outcomeProtectionActive?: boolean
  missingCriticalEvidence?: boolean
  decisionHint?: ProtectionDecision
  reason: string
}

export const protectionCapabilities = [
  { key: 'verification', label: 'Verification', route: '/protection/verification' },
  { key: 'drift', label: 'Drift', route: '/protection/drift' },
  { key: 'rollback', label: 'Rollback', route: '/protection/rollback' },
  { key: 'outcome-protection', label: 'Outcome Protection', route: '/protection/outcome-protection' },
  { key: 'trust', label: 'Trust', route: '/protection/trust' },
  { key: 'evidence', label: 'Protection Evidence Pack / Proof Pack', route: '/protection/evidence' },
] as const

export const emptyProtectionOutcomes: ProtectionOutcome[] = []

export const demoProtectionOutcomes: ProtectionOutcome[] = [
  { id: 'prot-verified', executedAction: 'M365 licence reclaim executed', sourceSystem: 'Execution Center + M365 audit log', preState: '94 inactive E5 users licensed', postState: '94 licences reclaimed and assignments removed', verificationResult: 'PASSED', protectedOutcome: 'Licence reclaim verified', driftStatus: 'NONE', rollbackStatus: 'AVAILABLE', owner: 'M365 Platform Lead', timestamp: '2026-07-06T08:00:00Z', lineage: 'execution/m365/reclaim/verification', confidence: 94, trustProofReference: 'proof:m365:verification', protectedValue: 118000, trustEvidenceAvailable: true, outcomeProtectionActive: false, decisionHint: 'VERIFIED', reason: 'Verified execution evidence proves the post-state matches the approved action.' },
  { id: 'prot-protected-finance', executedAction: 'Copilot licence recovery protected', sourceSystem: 'Outcome Ledger + Finance confirmation', preState: 'Monthly run-rate included inactive Copilot seats', postState: 'Recovered value retained in finance period', verificationResult: 'PASSED', protectedOutcome: 'Finance confirmed annual value retained', driftStatus: 'NONE', rollbackStatus: 'AVAILABLE', owner: 'IT Finance Partner', timestamp: '2026-07-06T09:00:00Z', lineage: 'outcome/copilot/finance-confirmed', confidence: 96, trustProofReference: 'proof:finance:protected-value', protectedValue: 216000, trustEvidenceAvailable: true, outcomeProtectionActive: true, decisionHint: 'PROTECTED', reason: 'Verified outcome and protection evidence prove the value remains protected.' },
  { id: 'prot-drift', executedAction: 'Cloud rightsizing completed', sourceSystem: 'Cloud billing + Drift monitor', preState: 'Oversized VM reduced after approval', postState: 'VM size returned to high-cost tier', verificationResult: 'PASSED', protectedOutcome: 'Cloud savings at risk', driftStatus: 'DRIFT_DETECTED', rollbackStatus: 'AVAILABLE', owner: 'Cloud Platform Owner', timestamp: '2026-07-06T10:00:00Z', lineage: 'cloud/drift/rightsizing', confidence: 83, trustProofReference: 'proof:cloud:drift', protectedValue: 312000, trustEvidenceAvailable: true, outcomeProtectionActive: true, decisionHint: 'DRIFTING', reason: 'Post-execution state changed and drift evidence is present.' },
  { id: 'prot-rollback-ready', executedAction: 'AI model route optimisation', sourceSystem: 'AI gateway + rollback policy', preState: 'Premium model route default', postState: 'Optimised route active with revert plan', verificationResult: 'PASSED', protectedOutcome: 'AI route savings protected by policy', driftStatus: 'NONE', rollbackStatus: 'READY', owner: 'AI Platform Owner', timestamp: '2026-07-06T11:00:00Z', lineage: 'ai/route/rollback-ready', confidence: 88, trustProofReference: 'proof:ai:rollback', protectedValue: 168000, trustEvidenceAvailable: true, outcomeProtectionActive: true, decisionHint: 'ROLLBACK_READY', reason: 'Rollback is available and tested for the protected route.' },
  { id: 'prot-rollback-required', executedAction: 'Snowflake warehouse auto-suspend', sourceSystem: 'Snowflake verification + Drift monitor', preState: 'Warehouse auto-suspend disabled', postState: 'Auto-suspend policy failed verification', verificationResult: 'FAILED', protectedOutcome: 'Warehouse savings not retained', driftStatus: 'HARMFUL_DRIFT', rollbackStatus: 'REQUIRED', owner: 'Data Platform Lead', timestamp: '2026-07-06T12:00:00Z', lineage: 'snowflake/verification/failed', confidence: 78, trustProofReference: 'proof:snowflake:failed-verification', protectedValue: 144000, trustEvidenceAvailable: true, outcomeProtectionActive: false, decisionHint: 'ROLLBACK_REQUIRED', reason: 'Failed verification and harmful drift require rollback.' },
  { id: 'prot-review', executedAction: 'SaaS owner cleanup', sourceSystem: 'SaaS inventory + identity', preState: 'Missing owners assigned', postState: 'Some owner evidence stale', verificationResult: 'PENDING', protectedOutcome: 'Ownership control pending verification', driftStatus: 'UNKNOWN', rollbackStatus: 'UNKNOWN', owner: 'SaaS Governance Lead', timestamp: '2026-07-06T13:00:00Z', lineage: 'saas/ownership/review', confidence: 61, trustProofReference: 'proof:saas:partial', protectedValue: 108000, trustEvidenceAvailable: true, outcomeProtectionActive: false, decisionHint: 'REVIEW', reason: 'Incomplete verification and drift evidence require review.' },
  { id: 'prot-blocked', executedAction: 'ServiceNow stale CI retirement', sourceSystem: 'ServiceNow change record', preState: 'Stale CI marked for retirement', verificationResult: 'MISSING', driftStatus: 'UNKNOWN', rollbackStatus: 'NOT_AVAILABLE', timestamp: '2026-07-06T14:00:00Z', confidence: 24, protectedValue: 0, trustEvidenceAvailable: false, outcomeProtectionActive: false, missingCriticalEvidence: true, decisionHint: 'BLOCKED', reason: 'Critical post-state, owner, lineage and trust proof evidence are missing.' },
]

export function getProtectionEvidencePackCompleteness(input: Partial<ProtectionOutcome>): { status: ProtectionEvidenceStatus; missing: string[] } {
  const required: Array<[keyof ProtectionOutcome, string]> = [
    ['executedAction', 'Executed action'], ['sourceSystem', 'Source system'], ['preState', 'Pre-state'], ['postState', 'Post-state'], ['verificationResult', 'Verification result'], ['protectedOutcome', 'Protected outcome'], ['driftStatus', 'Drift status'], ['rollbackStatus', 'Rollback status'], ['owner', 'Owner'], ['timestamp', 'Timestamp'], ['lineage', 'Lineage'], ['confidence', 'Confidence'], ['trustProofReference', 'Trust/proof reference'],
  ]
  const missing = required.filter(([key]) => input[key] === undefined || input[key] === '').map(([, label]) => label)
  return { status: missing.length ? 'PARTIAL' : 'COMPLETE', missing }
}

export function inferProtectionDecision(input: Partial<ProtectionOutcome>): { decision: ProtectionDecision; reason: string } {
  if (input.missingCriticalEvidence || input.verificationResult === 'MISSING') return { decision: 'BLOCKED', reason: 'Missing critical protection evidence blocks confidence.' }
  if (input.verificationResult === 'FAILED' || input.driftStatus === 'HARMFUL_DRIFT' || input.rollbackStatus === 'REQUIRED') return { decision: 'ROLLBACK_REQUIRED', reason: 'Failed verification or harmful drift requires rollback.' }
  if (input.driftStatus === 'DRIFT_DETECTED') return { decision: 'DRIFTING', reason: 'Post-execution state changed and drift evidence exists.' }
  if (input.rollbackStatus === 'READY') return { decision: 'ROLLBACK_READY', reason: 'Rollback is available and ready if protection fails.' }
  if (input.outcomeProtectionActive && input.protectedOutcome && input.trustProofReference) return { decision: 'PROTECTED', reason: 'Verified outcome has active protection and proof evidence.' }
  if (input.verificationResult === 'PASSED' && input.postState && input.trustProofReference) return { decision: 'VERIFIED', reason: 'Execution has verified post-state and trust proof.' }
  if (getProtectionEvidencePackCompleteness(input).status === 'PARTIAL') return { decision: 'REVIEW', reason: 'Incomplete protection evidence requires review.' }
  return { decision: 'REVIEW', reason: 'Protection state requires executive review.' }
}

export function summarizeProtectionKpis(outcomes: ProtectionOutcome[]) {
  const complete = outcomes.filter((item) => getProtectionEvidencePackCompleteness(item).status === 'COMPLETE').length
  return {
    verifiedOutcomes: outcomes.filter((item) => inferProtectionDecision(item).decision === 'VERIFIED').length,
    protectedOutcomes: outcomes.filter((item) => inferProtectionDecision(item).decision === 'PROTECTED').length,
    driftDetected: outcomes.filter((item) => item.driftStatus === 'DRIFT_DETECTED' || item.driftStatus === 'HARMFUL_DRIFT').length,
    rollbackReady: outcomes.filter((item) => item.rollbackStatus === 'READY' || item.rollbackStatus === 'AVAILABLE').length,
    rollbackRequired: outcomes.filter((item) => inferProtectionDecision(item).decision === 'ROLLBACK_REQUIRED').length,
    failedVerification: outcomes.filter((item) => item.verificationResult === 'FAILED').length,
    valueProtected: outcomes.reduce((sum, item) => sum + (item.protectedValue ?? 0), 0),
    trustEvidenceCoverage: outcomes.length ? Math.round((outcomes.filter((item) => item.trustEvidenceAvailable).length / outcomes.length) * 100) : undefined,
    evidenceCompleteness: outcomes.length ? Math.round((complete / outcomes.length) * 100) : undefined,
  }
}

export function program4LiveUnconnectedCopy(capability = 'Protection') {
  return `${capability} requires connected execution, verification, drift, rollback, outcome and trust evidence. No demo executions, verifications, drift, rollback status, protected value, trust evidence, outcomes or confidence are shown in live-unconnected mode.`
}
