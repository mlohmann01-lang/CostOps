export type EvidencePackCompletenessStatus = 'COMPLETE' | 'PARTIAL'

export const program1ExecutiveRoutes = [
  { route: '/actions', name: 'Action Center', question: 'What can safely be executed next?' },
  { route: '/approvals', name: 'Approval Center', question: 'What decisions require approval today?' },
  { route: '/executive-value', name: 'Executive Value Dashboard', question: 'Where is value projected, approved, executed, verified, finance-confirmed, protected, or leaking?' },
  { route: '/outcomes', name: 'Outcome Ledger', question: 'What value has actually been realised and protected?' },
  { route: '/evidence', name: 'Evidence Pack / Proof Pack', question: 'Can each claim be defended with source evidence and chain of custody?' },
  { route: '/executive-proof-packs', name: 'Executive Proof Packs', question: 'Are boardroom proof packs complete enough to export?' },
] as const

export const evidencePackRequiredFields = [
  'source',
  'owner',
  'actionOrRecommendation',
  'decision',
  'valueBasis',
  'verificationStatus',
  'confidence',
  'timestamps',
  'outcomeOrProtectionState',
] as const

export type EvidencePackCompletenessInput = Partial<Record<(typeof evidencePackRequiredFields)[number], unknown>>

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

export function getEvidencePackCompleteness(pack: EvidencePackCompletenessInput) {
  const missing = evidencePackRequiredFields.filter((field) => !hasValue(pack[field]))
  return {
    status: missing.length === 0 ? 'COMPLETE' as const : 'PARTIAL' as const,
    missing,
  }
}
