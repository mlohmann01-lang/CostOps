export type OwnershipDecision = 'VERIFIED' | 'ASSIGN' | 'REASSIGN' | 'REVIEW' | 'ESCALATE' | 'BLOCKED'
export type OwnershipEvidenceStatus = 'COMPLETE' | 'PARTIAL'

export const program3OwnershipRoute = {
  route: '/ownership-accountability',
  name: 'Ownership & Accountability',
  question: 'Who is accountable for every critical technology asset, decision, contract, renewal, spend, and business outcome—and where are ownership gaps creating risk?',
} as const

export const ownershipEvidenceRequiredFields = [
  'assetIdentifier',
  'ownerIdentity',
  'ownerType',
  'businessUnit',
  'costCentre',
  'assignmentBasis',
  'decisionAuthority',
  'verificationStatus',
  'confidence',
  'sourceSystem',
  'timestamp',
  'lineage',
] as const

export const ownershipEvidenceConditionalFields = [
  'executiveSponsor',
  'renewalResponsibility',
  'outcomeProtectionLinkage',
] as const

export type OwnershipEvidencePackInput = Partial<Record<(typeof ownershipEvidenceRequiredFields)[number] | (typeof ownershipEvidenceConditionalFields)[number], unknown>> & {
  executiveSponsorApplicable?: boolean
  renewalApplicable?: boolean
  outcomeApplicable?: boolean
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

export function getOwnershipEvidencePackCompleteness(pack: OwnershipEvidencePackInput) {
  const required: Array<(typeof ownershipEvidenceRequiredFields)[number] | (typeof ownershipEvidenceConditionalFields)[number]> = [...ownershipEvidenceRequiredFields]
  if (pack.executiveSponsorApplicable) required.push('executiveSponsor')
  if (pack.renewalApplicable) required.push('renewalResponsibility')
  if (pack.outcomeApplicable) required.push('outcomeProtectionLinkage')
  const missing = required.filter((field) => !hasValue(pack[field as keyof OwnershipEvidencePackInput]))
  return { status: missing.length === 0 ? 'COMPLETE' as const : 'PARTIAL' as const, missing }
}

export function inferOwnershipDecision(input: { ownerIdentity?: string; ownerStatus?: string; ownerConflict?: boolean; executiveSponsor?: string; evidenceStatus?: OwnershipEvidenceStatus; verificationStatus?: string }): { decision: OwnershipDecision; reason: string } {
  if (input.verificationStatus === 'MISSING_EVIDENCE') return { decision: 'BLOCKED', reason: 'Missing ownership evidence prevents verified accountability.' }
  if (!input.ownerIdentity || input.ownerStatus === 'MISSING') return { decision: 'ASSIGN', reason: 'No Responsible Owner is assigned.' }
  if (input.ownerConflict) return { decision: 'REVIEW', reason: 'Multiple owners conflict and require executive review.' }
  if (!input.executiveSponsor) return { decision: 'ESCALATE', reason: 'No Executive Sponsor is accountable for the asset or outcome.' }
  if (input.ownerStatus === 'DEPARTED') return { decision: 'REASSIGN', reason: 'The recorded owner has departed and accountability must be reassigned.' }
  if (input.evidenceStatus === 'PARTIAL') return { decision: 'BLOCKED', reason: 'Missing ownership evidence prevents verified accountability.' }
  return { decision: 'VERIFIED', reason: 'Responsible Owner, Executive Sponsor, and evidence are verified.' }
}
