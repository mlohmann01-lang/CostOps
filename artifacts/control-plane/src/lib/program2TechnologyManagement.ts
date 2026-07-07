import type { TechnologyManagementDecision, TechnologyPortfolioAsset } from '../types/technologyPortfolio'

export type Program2EvidencePackCompletenessStatus = 'COMPLETE' | 'PARTIAL'

export const program2TechnologyManagementRoute = {
  route: '/technology-portfolio',
  name: 'Technology Management',
  question: 'Which technology assets, contracts, renewals, owners, overlaps, and risks require management action now?',
} as const

export const program2EvidenceRequiredFields = [
  'assetSourceSystem',
  'ownerOrOwnerStatus',
  'businessUnitOrCostCentre',
  'spendOrValueBasis',
  'recommendedManagementDecision',
  'verificationStatus',
  'confidence',
  'timestampOrLineage',
] as const

export const program2ConditionalEvidenceFields = [
  'contractOrRenewalBasis',
  'usageOrUtilisationBasis',
  'riskOrOverlapReason',
  'outcomeOrProtectionState',
] as const

export type Program2EvidencePackInput = Partial<Record<(typeof program2EvidenceRequiredFields)[number] | (typeof program2ConditionalEvidenceFields)[number], unknown>> & {
  renewalApplicable?: boolean
  usageApplicable?: boolean
  riskOrOverlapApplicable?: boolean
  outcomeApplicable?: boolean
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

export function getProgram2EvidencePackCompleteness(pack: Program2EvidencePackInput) {
  const required: Array<(typeof program2EvidenceRequiredFields)[number] | (typeof program2ConditionalEvidenceFields)[number]> = [...program2EvidenceRequiredFields]
  if (pack.renewalApplicable) required.push('contractOrRenewalBasis')
  if (pack.usageApplicable) required.push('usageOrUtilisationBasis')
  if (pack.riskOrOverlapApplicable) required.push('riskOrOverlapReason')
  if (pack.outcomeApplicable) required.push('outcomeOrProtectionState')
  const missing = required.filter((field) => !hasValue(pack[field as keyof Program2EvidencePackInput]))
  return { status: missing.length === 0 ? 'COMPLETE' as const : 'PARTIAL' as const, missing }
}

export function inferTechnologyManagementDecision(asset: Pick<TechnologyPortfolioAsset, 'ownerUserId' | 'ownerStatus' | 'costCentreId' | 'annualSpend' | 'utilisation' | 'renewalDate' | 'evidenceCompletenessStatus' | 'managementDecision'>, hasHighRisk = false): TechnologyManagementDecision {
  if (asset.managementDecision) return asset.managementDecision
  if (hasHighRisk && (!asset.ownerUserId || asset.ownerStatus === 'MISSING')) return 'BLOCKED'
  if (!asset.ownerUserId || asset.ownerStatus === 'MISSING' || !asset.costCentreId || asset.evidenceCompletenessStatus === 'PARTIAL') return 'REVIEW'
  if ((asset.utilisation ?? 100) < 35 && (asset.annualSpend ?? 0) > 50000) return 'OPTIMISE'
  if (asset.renewalDate) return 'RENEW'
  return 'KEEP'
}
