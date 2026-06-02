import type { M365SnapshotBundle } from '../../connectors/m365/m365-snapshot-repository'
import type { EvidenceQuality } from './m365-economic-intelligence-types'
import type { M365SkuCostEstimate } from './m365-sku-cost-authority'
import type { M365EntitlementRelationship } from './m365-entitlement-matrix'

export interface M365EvidenceQualityInput {
  playbookId: string
  entityId: string
  entityType: string
  evidence: string[]
  costEstimates?: M365SkuCostEstimate[]
  entitlementRelationships?: M365EntitlementRelationship[]
}

export interface M365EvidenceQualityResult {
  evidenceQuality: EvidenceQuality
  evidenceReasons: string[]
}

const has = (evidence: string[], prefix: string) => evidence.some((item) => item.toLowerCase().startsWith(prefix.toLowerCase()))
const knownCost = (input: M365EvidenceQualityInput) => (input.costEstimates ?? []).some((estimate) => estimate.confidence !== 'UNKNOWN' && estimate.monthlyUnitCost > 0)
const relationshipKnown = (input: M365EvidenceQualityInput) => (input.entitlementRelationships ?? []).some((row) => row.relationship !== 'UNKNOWN')

export function scoreM365EvidenceQuality(input: M365EvidenceQualityInput, snapshot?: M365SnapshotBundle | null): M365EvidenceQualityResult {
  const evidence = input.evidence ?? []
  const reasons: string[] = []
  let score = 0
  const user = snapshot?.users.find((u) => u.id === input.entityId)
  const group = snapshot?.groups.find((g: any) => String(g.id) === input.entityId)
  const sku = snapshot?.skus.find((s) => s.skuId === input.entityId)
  const mailbox = user ? snapshot?.mailboxes.find((m) => m.userPrincipalName.toLowerCase() === user.userPrincipalName.toLowerCase()) : null
  const usage = user ? snapshot?.usageRecords.find((r) => r.userPrincipalName.toLowerCase() === user.userPrincipalName.toLowerCase()) : null

  switch (input.playbookId) {
    case 'm365-inactive-user-reclaim':
      if (user) { score += 2; reasons.push('User source record exists.') } else reasons.push('Missing user source record.')
      if (typeof user?.accountEnabled === 'boolean') { score += 1; reasons.push('Account enabled status is known.') }
      if ((user?.assignedLicenses.length ?? 0) > 0) { score += 2; reasons.push('Assigned license evidence exists.') }
      if (has(evidence, 'lastSignIn:') && !evidence.includes('lastSignIn:missing')) { score += 2; reasons.push('Last sign-in evidence exists; interpretation remains conservative because signInActivity can include unsuccessful sign-ins.') } else if (usage) { score += 1; reasons.push('Usage report evidence exists when sign-in evidence is missing.') } else reasons.push('Missing last sign-in or usage report evidence.')
      if (has(evidence, 'protectedSignalsEvaluated:')) { score += 1; reasons.push('Protected-account exclusion signals evaluated.') }
      if (knownCost(input)) { score += 1; reasons.push('SKU cost evidence exists.') }
      break
    case 'm365-copilot-rightsizing':
      if (user && has(evidence, 'license:')) { score += 2; reasons.push('Copilot assignment evidence exists.') }
      if (has(evidence, 'copilotUsage:') && !has(evidence, 'usageEvidence:missing')) { score += 2; reasons.push('Usage band evidence exists.') } else reasons.push('Missing direct/strong Copilot usage evidence.')
      if (has(evidence, 'lastSignIn:') && !evidence.includes('lastSignIn:missing')) { score += 1; reasons.push('Last activity evidence exists.') }
      if (knownCost(input)) { score += 1; reasons.push('Copilot cost evidence exists.') }
      break
    case 'm365-shared-mailbox-conversion':
      if (mailbox) { score += 2; reasons.push('Mailbox source record exists.') } else reasons.push('Missing mailbox source record.')
      if (mailbox?.lastActivityDate) { score += 1; reasons.push('Mailbox activity evidence exists.') }
      if (mailbox?.recipientType === 'SHARED' || has(evidence, 'mailboxHeuristic:strong')) { score += 2; reasons.push('Recipient type or strong shared-mailbox heuristic exists.') }
      if (has(evidence, 'ownerReview:')) { score += 1; reasons.push('Ownership/review evidence exists.') } else reasons.push('Missing ownership/review evidence.')
      if (knownCost(input)) { score += 1; reasons.push('License cost evidence exists.') }
      break
    case 'm365-duplicate-license-detection':
      if ((user?.assignedLicenses.length ?? 0) >= 2) { score += 2; reasons.push('Two or more license assignments exist.') }
      if (relationshipKnown(input)) { score += 2; reasons.push('Entitlement matrix relationship evidence exists.') } else reasons.push('Entitlement overlap relationship is unknown.')
      if (knownCost(input)) { score += 1; reasons.push('Overlapping SKU cost evidence exists.') }
      break
    case 'm365-security-sku-rationalization':
      if ((user?.assignedLicenses.length ?? 0) >= 2) { score += 2; reasons.push('Suite and security license assignment evidence exists.') }
      if (relationshipKnown(input)) { score += 1; reasons.push('Security entitlement matrix evidence exists.') } else reasons.push('Security entitlement overlap is not proven.')
      if (has(evidence, 'securityReviewRequired:')) { score += 1; reasons.push('Security-owner review requirement is recorded.') }
      if (knownCost(input)) { score += 1; reasons.push('Security SKU cost evidence exists.') }
      break
    case 'm365-dormant-group-cleanup':
      if (group) { score += 2; reasons.push('Group source record exists.') }
      if (has(evidence, 'owner:')) { score += 1; reasons.push('Owner evidence exists.') }
      if (has(evidence, 'lastActivity:')) { score += 1; reasons.push('Activity evidence exists.') }
      break
    case 'm365-license-pool-recovery':
      if (sku) { score += 2; reasons.push('Subscribed SKU source record exists.') }
      if (has(evidence, 'unusedCapacity:')) { score += 1; reasons.push('Prepaid and consumed unit evidence exists.') }
      if (has(evidence, 'inactiveAssigned:')) { score += 1; reasons.push('Assignment/activity correlation evidence exists.') }
      if (knownCost(input)) { score += 1; reasons.push('SKU cost evidence exists.') }
      break
    default:
      score = evidence.length >= 3 ? 4 : evidence.length
      reasons.push('Generic M365 evidence score applied.')
  }

  const evidenceQuality: EvidenceQuality = score >= 7 ? 'STRONG' : score >= 5 ? 'ADEQUATE' : score >= 3 ? 'WEAK' : 'INSUFFICIENT'
  return { evidenceQuality, evidenceReasons: reasons }
}
