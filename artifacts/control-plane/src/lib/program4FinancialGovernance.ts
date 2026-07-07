export type FinancialDecision = 'INVEST' | 'EXPAND' | 'KEEP' | 'OPTIMISE' | 'CONSOLIDATE' | 'RETIRE' | 'REVIEW' | 'BLOCKED'
export type FinanceEvidenceStatus = 'COMPLETE' | 'PARTIAL'

export const program4FinancialGovernanceRoute = {
  route: '/executive-value',
  aliasRoute: '/financial-governance',
  name: 'Financial Governance',
  question: 'Where is technology investment creating measurable business value—and where is value being lost?',
} as const

export const financeEvidenceRequiredFields = [
  'investmentIdentifier',
  'assetOrInitiative',
  'businessObjective',
  'investmentOwner',
  'spendBasis',
  'budgetBasis',
  'costCentre',
  'financialPeriod',
  'expectedOutcome',
  'measuredOutcome',
  'protectedOutcome',
  'valueRealised',
  'executiveDecision',
  'financeConfirmationStatus',
  'verification',
  'confidence',
  'sourceSystems',
  'lineage',
  'timestamp',
  'outcomeLinkage',
] as const

export type FinanceEvidencePackInput = Partial<Record<(typeof financeEvidenceRequiredFields)[number] | 'leakage', unknown>> & { leakageApplicable?: boolean }

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

export function getFinanceEvidencePackCompleteness(pack: FinanceEvidencePackInput) {
  const required: Array<(typeof financeEvidenceRequiredFields)[number] | 'leakage'> = [...financeEvidenceRequiredFields]
  if (pack.leakageApplicable) required.push('leakage')
  const missing = required.filter((field) => !hasValue(pack[field as keyof FinanceEvidencePackInput]))
  return { status: missing.length === 0 ? 'COMPLETE' as const : 'PARTIAL' as const, missing }
}

export function inferFinancialDecision(input: { hasFinancialEvidence?: boolean; valueBasis?: 'VERIFIED' | 'ESTIMATED' | 'MISSING'; financeConfirmed?: boolean; roi?: number; duplicateSpend?: boolean; underPerforming?: boolean; growthOpportunity?: boolean }): { decision: FinancialDecision; reason: string } {
  if (!input.hasFinancialEvidence || input.valueBasis === 'MISSING') return { decision: 'BLOCKED', reason: 'No financial evidence is available to support an investment decision.' }
  if (input.duplicateSpend) return { decision: 'CONSOLIDATE', reason: 'Duplicate spend evidence supports consolidation.' }
  if (typeof input.roi === 'number' && input.roi < 0) return { decision: 'RETIRE', reason: 'Negative ROI evidence supports retirement.' }
  if (input.underPerforming) return { decision: 'OPTIMISE', reason: 'Under-performing investment evidence supports optimisation.' }
  if (input.growthOpportunity) return { decision: 'EXPAND', reason: 'Verified growth evidence supports expansion.' }
  if (input.valueBasis === 'ESTIMATED' || !input.financeConfirmed) return { decision: 'REVIEW', reason: 'Value is estimated or not finance-confirmed and requires executive review.' }
  if (input.valueBasis === 'VERIFIED' && input.financeConfirmed) return { decision: 'KEEP', reason: 'Finance-confirmed verified value supports keeping the investment.' }
  return { decision: 'INVEST', reason: 'Evidence supports investment consideration.' }
}
