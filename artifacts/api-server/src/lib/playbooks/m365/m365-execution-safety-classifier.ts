import type { M365SnapshotBundle } from '../../connectors/m365/m365-snapshot-repository'
import type { M365TrustReport, TrustBand } from '../../connectors/m365/m365-types'
import type { M365EconomicIntelligenceAssessment, EvidenceQuality, FalsePositiveRisk, ProductionReadiness, SavingsConfidence, ExecutionSafety, AllowedNextStep, M365TrustGateResult } from './m365-economic-intelligence-types'
import type { M365SkuCostEstimate } from './m365-sku-cost-authority'
import type { M365EntitlementRelationship } from './m365-entitlement-matrix'
import { lowestEntitlementConfidence } from './m365-entitlement-matrix'

export interface M365ExecutionSafetyCandidate {
  playbookId: string
  entityId: string
  entityType: string
  projectedMonthlySavings: number
  savingsConfidence: SavingsConfidence
  evidenceQuality: EvidenceQuality
  evidenceReasons: string[]
  evidence: string[]
  blockers?: string[]
  costEstimates?: M365SkuCostEstimate[]
  entitlementRelationships?: M365EntitlementRelationship[]
  requiredHumanReview?: boolean
}

export interface M365ExecutionSafetyContext {
  snapshot?: M365SnapshotBundle | null
  trust?: M365TrustReport | null
}

function bandAtLeast(band: TrustBand | undefined, min: 'HIGH' | 'TRUSTED') {
  if (min === 'TRUSTED') return band === 'TRUSTED'
  return band === 'HIGH' || band === 'TRUSTED'
}

function highTrust(trust?: M365TrustReport | null) {
  if (!trust) return { passed: false, result: 'PENDING_TRUST_GATE' as M365TrustGateResult, reasons: ['Trust report not attached to candidate yet.'] }
  const dimensions = [trust.identityTrust, trust.licenseTrust, trust.usageTrust, trust.activityTrust, trust.executionSafetyTrust]
  const passed = dimensions.every((dimension) => bandAtLeast(dimension.band, 'HIGH')) && bandAtLeast(trust.globalTrustBand, 'HIGH')
  return { passed, result: passed ? 'PASSED' as const : 'FAILED' as const, reasons: passed ? ['All required trust dimensions are HIGH or TRUSTED.'] : ['READY_FOR_APPROVAL requires global, identity, license, usage, activity, and execution safety trust at HIGH or TRUSTED; INVESTIGATE is insufficient.'] }
}

function riskRank(risk: FalsePositiveRisk) { return risk === 'LOW' ? 0 : risk === 'MEDIUM' ? 1 : risk === 'HIGH' ? 2 : 3 }
function confidenceOk(confidence: SavingsConfidence) { return confidence === 'HIGH' || confidence === 'MEDIUM' }
function evidenceOk(quality: EvidenceQuality) { return quality === 'STRONG' || quality === 'ADEQUATE' }

export function classifyM365ExecutionSafety(candidate: M365ExecutionSafetyCandidate, context: M365ExecutionSafetyContext = {}): M365EconomicIntelligenceAssessment {
  const user = context.snapshot?.users.find((u) => u.id === candidate.entityId)
  const assignmentRows = user ? context.snapshot?.licenseAssignments.filter((assignment) => assignment.userId === user.id && user.assignedLicenses.includes(assignment.skuId)) ?? [] : []
  const groupAssigned = assignmentRows.some((assignment) => assignment.assignmentType === 'GROUP')
  const unknownAssignment = user && user.assignedLicenses.length > 0 && assignmentRows.length === 0
  const missingUsageData = candidate.evidence.some((item) => /usageEvidence:missing|lastSignIn:missing/i.test(item))
  const unknownCost = candidate.savingsConfidence === 'UNKNOWN' || (candidate.costEstimates ?? []).some((estimate) => estimate.confidence === 'UNKNOWN')
  const protectedUser = Boolean(user?.isAdminCandidate || user?.isServiceAccountCandidate || user?.isSharedMailboxCandidate || user?.isNoReplyCandidate || (user as any)?.isVipCandidate || (user as any)?.isProtectedCandidate)
  const entitlementConfidence = lowestEntitlementConfidence(candidate.entitlementRelationships ?? [])
  const trustGate = highTrust(context.trust)
  const blockers = new Set(candidate.blockers ?? [])
  const safetyReasons: string[] = []
  const savingsReasons = (candidate.costEstimates ?? []).flatMap((estimate) => estimate.reasons)
  let falsePositiveRisk: FalsePositiveRisk = 'MEDIUM'
  let executionSafety: ExecutionSafety = 'REVIEW_REQUIRED'
  let productionReadiness: ProductionReadiness = 'NEEDS_HARDENING'
  let allowedNextStep: AllowedNextStep = 'REVIEW_ONLY'
  let requiredHumanReview = true

  if (unknownCost) { blockers.add('Unknown SKU cost prevents execution-grade savings.'); safetyReasons.push('Unknown SKU cost data is not execution eligible.') }
  if (protectedUser) { blockers.add('Protected account signal present.'); safetyReasons.push('Protected admin/service/shared/no-reply/VIP signal requires block or manual review.') }
  if (groupAssigned) { safetyReasons.push('Group-assigned license cannot be removed by per-user execution without additional approval.'); blockers.add('Group-assigned license requires review.') }
  if (unknownAssignment && candidate.playbookId === 'm365-inactive-user-reclaim') safetyReasons.push('License assignment type is unknown; treat as review required.')
  if (missingUsageData) safetyReasons.push('Missing usage/activity evidence is treated conservatively, not as proof of inactivity.')

  switch (candidate.playbookId) {
    case 'm365-inactive-user-reclaim':
      falsePositiveRisk = protectedUser || missingUsageData ? 'CRITICAL' : groupAssigned || unknownAssignment ? 'MEDIUM' : 'LOW'
      if (protectedUser) executionSafety = 'BLOCKED'
      else if (trustGate.passed && evidenceOk(candidate.evidenceQuality) && confidenceOk(candidate.savingsConfidence) && falsePositiveRisk === 'LOW' && blockers.size === 0) {
        executionSafety = 'SAFE_TO_RECOMMEND'; productionReadiness = 'READY_FOR_APPROVAL'; allowedNextStep = 'SUBMIT_FOR_APPROVAL'; requiredHumanReview = false; safetyReasons.push('Inactive user reclaim passed high-trust, evidence, savings, and false-positive gates.')
      } else { executionSafety = 'REVIEW_REQUIRED'; safetyReasons.push('Inactive user reclaim remains review-required until trust, assignment, protected-account, evidence, and savings gates pass.') }
      break
    case 'm365-copilot-rightsizing':
      falsePositiveRisk = missingUsageData ? 'HIGH' : 'MEDIUM'
      executionSafety = 'REVIEW_REQUIRED'; productionReadiness = 'NEEDS_HARDENING'; allowedNextStep = 'REVIEW_ONLY'; safetyReasons.push('Copilot rightsizing is review-only in this sprint; generic usage evidence is not live-removal permission.')
      break
    case 'm365-shared-mailbox-conversion':
      falsePositiveRisk = candidate.evidenceQuality === 'INSUFFICIENT' || candidate.evidenceQuality === 'WEAK' ? 'HIGH' : 'MEDIUM'
      executionSafety = protectedUser ? 'BLOCKED' : 'REVIEW_REQUIRED'; productionReadiness = executionSafety === 'BLOCKED' ? 'NOT_READY' : 'NEEDS_HARDENING'; allowedNextStep = executionSafety === 'BLOCKED' ? 'BLOCK' : 'REVIEW_ONLY'; safetyReasons.push('Shared mailbox conversion is never ready for approval in this sprint.')
      break
    case 'm365-duplicate-license-detection':
      falsePositiveRisk = entitlementConfidence === 'HIGH' ? 'MEDIUM' : 'HIGH'
      executionSafety = 'REVIEW_REQUIRED'; productionReadiness = 'NEEDS_HARDENING'; allowedNextStep = 'REVIEW_ONLY'; safetyReasons.push(entitlementConfidence === 'HIGH' ? 'High-confidence entitlement relationship still requires review; live removal is deferred.' : 'Unknown or medium entitlement overlap cannot be treated as execution-ready.')
      break
    case 'm365-security-sku-rationalization':
      falsePositiveRisk = 'CRITICAL'
      executionSafety = 'REVIEW_REQUIRED'; productionReadiness = 'NOT_READY'; allowedNextStep = 'REVIEW_ONLY'; safetyReasons.push('Security SKU rationalization defaults to review-required; security posture changes are deferred.')
      break
    case 'm365-dormant-group-cleanup':
      falsePositiveRisk = 'MEDIUM'
      executionSafety = 'REVIEW_REQUIRED'; productionReadiness = 'NEEDS_HARDENING'; allowedNextStep = 'REVIEW_ONLY'; safetyReasons.push('Dormant group cleanup is review-only and has no license execution eligibility.')
      break
    case 'm365-license-pool-recovery':
      falsePositiveRisk = 'MEDIUM'
      executionSafety = 'REVIEW_REQUIRED'; productionReadiness = 'NEEDS_HARDENING'; allowedNextStep = 'SHOW_OPPORTUNITY'; safetyReasons.push('License pool recovery is an opportunity signal only; no execution eligibility is emitted.')
      break
    default:
      falsePositiveRisk = 'HIGH'; executionSafety = 'REVIEW_REQUIRED'; productionReadiness = 'NEEDS_HARDENING'; allowedNextStep = 'REVIEW_ONLY'; safetyReasons.push('Unknown M365 playbook defaults to review-required.')
  }

  if (!trustGate.passed && productionReadiness === 'READY_FOR_APPROVAL') {
    productionReadiness = 'NEEDS_HARDENING'; executionSafety = 'REVIEW_REQUIRED'; allowedNextStep = 'REVIEW_ONLY'; requiredHumanReview = true
  }
  if (blockers.size > 0 && (executionSafety === 'BLOCKED' || riskRank(falsePositiveRisk) >= riskRank('HIGH'))) {
    if (protectedUser || unknownCost) { executionSafety = 'BLOCKED'; productionReadiness = 'NOT_READY'; allowedNextStep = 'BLOCK' }
  }

  return {
    savingsConfidence: candidate.savingsConfidence,
    executionSafety,
    productionReadiness,
    falsePositiveRisk,
    evidenceQuality: candidate.evidenceQuality,
    savingsReasons: savingsReasons.length ? savingsReasons : ['Savings confidence derived from SKU cost authority.'],
    safetyReasons,
    evidenceReasons: candidate.evidenceReasons,
    blockers: Array.from(blockers),
    requiredHumanReview,
    allowedNextStep,
    trustGateResult: trustGate.result,
    trustGateReasons: trustGate.reasons,
  }
}
