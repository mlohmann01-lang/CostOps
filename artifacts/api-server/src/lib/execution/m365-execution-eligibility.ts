import type { M365EconomicIntelligenceAssessment } from '../playbooks/m365/m365-economic-intelligence-types'
import type { M365SnapshotBundle } from '../connectors/m365/m365-snapshot-repository'
import type { M365TrustReport, TrustBand } from '../connectors/m365/m365-types'

export type M365ExecutionEligibilityClassification = 'EXECUTION_READY' | 'REVIEW_REQUIRED' | 'BLOCKED'

export interface ExecutionEligibilityResult {
  eligible: boolean
  classification: M365ExecutionEligibilityClassification
  blockers: string[]
  warnings: string[]
  evaluatedAt: string
}

export interface M365ExecutionEligibilityInput {
  opportunity: Record<string, any>
  trust?: M365TrustReport | null
  economicAssessment?: M365EconomicIntelligenceAssessment | null
  snapshot?: M365SnapshotBundle | null
  approvalState?: string | null
}

function highOrTrusted(band?: TrustBand) {
  return band === 'HIGH' || band === 'TRUSTED'
}

function isInactiveUserReclaim(opportunity: Record<string, any>) {
  return String(opportunity.playbookId ?? opportunity.recommendationKey ?? '').includes('m365-inactive-user-reclaim')
}

function isAllowedExecutionType(opportunity: Record<string, any>) {
  return opportunity.executionType === 'INACTIVE_USER_LICENSE_RECLAIM'
}

function isAllowedMutation(opportunity: Record<string, any>) {
  return opportunity.mutationType === 'REMOVE_M365_LICENSE'
}

export function evaluateM365ExecutionEligibility(input: M365ExecutionEligibilityInput): ExecutionEligibilityResult {
  const blockers: string[] = []
  const warnings: string[] = []
  const opportunity = input.opportunity
  const assessment = input.economicAssessment ?? opportunity.economicAssessment
  const trust = input.trust

  if (!isInactiveUserReclaim(opportunity)) blockers.push('Only Inactive User Reclaim may enter M365 execution validation.')
  if (!isAllowedExecutionType(opportunity)) blockers.push('Execution type must be INACTIVE_USER_LICENSE_RECLAIM.')
  if (!isAllowedMutation(opportunity)) blockers.push('Mutation type must be REMOVE_M365_LICENSE.')
  if (!input.snapshot) blockers.push('M365 snapshot evidence is required.')
  if (!assessment) blockers.push('Economic assessment is required.')
  if (assessment?.executionSafety !== 'SAFE_TO_RECOMMEND') blockers.push('Execution safety must be SAFE_TO_RECOMMEND.')
  if (assessment?.productionReadiness !== 'READY_FOR_APPROVAL') blockers.push('Production readiness must be READY_FOR_APPROVAL.')
  if (assessment?.falsePositiveRisk !== 'LOW') blockers.push('False-positive risk must be LOW.')
  if (!['STRONG', 'ADEQUATE'].includes(String(assessment?.evidenceQuality))) blockers.push('Evidence quality must be STRONG or ADEQUATE.')
  if (!['HIGH', 'MEDIUM'].includes(String(assessment?.savingsConfidence))) blockers.push('Savings confidence must be HIGH or MEDIUM.')
  if (!trust) blockers.push('M365 trust report is required.')
  else {
    const failed = [trust.identityTrust, trust.licenseTrust, trust.usageTrust, trust.activityTrust, trust.executionSafetyTrust].filter((dimension) => !highOrTrusted(dimension.band))
    if (failed.length) blockers.push('Identity, license, usage, activity, and execution safety trust must all be HIGH or TRUSTED.')
    if (!highOrTrusted(trust.globalTrustBand)) warnings.push('Global trust is below HIGH; execution remains blocked by dimension gates.')
  }
  if (input.approvalState !== 'APPROVED') blockers.push('Approval state is not APPROVED.')

  const eligible = blockers.length === 0
  return { eligible, classification: eligible ? 'EXECUTION_READY' : 'BLOCKED', blockers, warnings, evaluatedAt: new Date().toISOString() }
}
