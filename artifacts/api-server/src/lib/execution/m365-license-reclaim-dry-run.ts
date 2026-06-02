import { platformEventService } from '../events/platform-event-service'
import type { M365SnapshotBundle } from '../connectors/m365/m365-snapshot-repository'
import type { M365TrustReport } from '../connectors/m365/m365-types'
import { evaluateM365ExecutionEligibility } from './m365-execution-eligibility'
import { buildM365LicenseRollbackPlan, type RollbackPlan } from './m365-license-rollback-plan'

export interface M365LicenseReclaimDryRunInput {
  tenantId: string
  opportunity: Record<string, any>
  snapshot: M365SnapshotBundle
  trust: M365TrustReport
  approvalState: string
  userId: string
  skuId: string
  writeReady: boolean
}

export interface DryRunResult {
  status: 'READY' | 'WARNING' | 'BLOCKED'
  blockers: string[]
  warnings: string[]
  beforeState: Record<string, any>
  expectedAfterState: Record<string, any>
  rollbackPlan: RollbackPlan
}

export async function runM365LicenseReclaimDryRun(input: M365LicenseReclaimDryRunInput): Promise<DryRunResult> {
  const user = input.snapshot.users.find((row) => row.id === input.userId)
  const assignment = input.snapshot.licenseAssignments.find((row) => row.userId === input.userId && row.skuId === input.skuId)
  const blockers: string[] = []
  const warnings: string[] = []
  if (!user) blockers.push('User does not exist in snapshot.')
  if (user && !user.assignedLicenses.includes(input.skuId)) blockers.push('License is not assigned to user.')
  if (user?.isAdminCandidate) blockers.push('Admin candidate cannot be executed.')
  if (user?.isServiceAccountCandidate) blockers.push('Service account candidate cannot be executed.')
  if (user?.isSharedMailboxCandidate) blockers.push('Shared mailbox candidate cannot be executed.')
  if (user?.isNoReplyCandidate) blockers.push('No-reply candidate cannot be executed.')
  if (!assignment) blockers.push('Direct license assignment evidence is required to prove the license is not group-assigned.')
  if (assignment?.assignmentType === 'GROUP') blockers.push('Group-assigned license cannot be removed through one-user direct reclaim.')
  if (assignment?.assignmentType === 'UNKNOWN') blockers.push('Unknown license assignment type cannot enter governed execution.')
  const eligibility = evaluateM365ExecutionEligibility({ opportunity: input.opportunity, trust: input.trust, economicAssessment: input.opportunity.economicAssessment, snapshot: input.snapshot, approvalState: input.approvalState })
  blockers.push(...eligibility.blockers.map((blocker) => `Eligibility: ${blocker}`))
  warnings.push(...eligibility.warnings)
  if (input.approvalState !== 'APPROVED') blockers.push('Approval Authority state must be APPROVED.')
  if (!input.writeReady) blockers.push('Write readiness is required before dry run can become READY.')
  const rollbackPlan = buildM365LicenseRollbackPlan({ tenantId: input.tenantId, userId: input.userId, userPrincipalName: user?.userPrincipalName, skuId: input.skuId, skuPartNumber: assignment?.skuPartNumber, assignmentType: assignment?.assignmentType, userExists: Boolean(user) })
  if (!rollbackPlan.supported) blockers.push(...rollbackPlan.blockers.map((blocker) => `Rollback: ${blocker}`))
  const beforeLicenses = user?.assignedLicenses ?? []
  const result: DryRunResult = { status: blockers.length ? 'BLOCKED' : warnings.length ? 'WARNING' : 'READY', blockers, warnings, beforeState: { userId: input.userId, userPrincipalName: user?.userPrincipalName, assignedLicenses: beforeLicenses }, expectedAfterState: { userId: input.userId, assignedLicenses: beforeLicenses.filter((skuId) => skuId !== input.skuId), removedSkuId: input.skuId }, rollbackPlan }
  await platformEventService.recordExecutionEvent(input.tenantId, result.status === 'BLOCKED' ? 'M365_DRY_RUN_BLOCKED' : 'M365_DRY_RUN_COMPLETED', { entityType: 'M365_USER', entityId: input.userId, sourceSystem: 'm365-license-reclaim-dry-run', metadata: result as any }).catch(() => undefined)
  return result
}
