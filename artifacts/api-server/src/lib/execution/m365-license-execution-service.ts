import { platformEventService } from '../events/platform-event-service'
import { outcomeProofService } from '../outcomes/outcome-proof-service'
import type { M365GraphClient } from '../connectors/m365/m365-graph-client'
import type { M365SnapshotBundle } from '../connectors/m365/m365-snapshot-repository'
import type { M365TrustReport } from '../connectors/m365/m365-types'
import { evaluateM365ExecutionEligibility } from './m365-execution-eligibility'
import { runM365LicenseReclaimDryRun, type DryRunResult } from './m365-license-reclaim-dry-run'
import { m365LicenseVerificationService, type VerificationResult } from './m365-license-verification-service'

export interface M365LicenseExecutionRequest { executionRequestId: string; tenantId: string; opportunity: Record<string, any>; snapshot: M365SnapshotBundle; trust: M365TrustReport; approvalState: string; userId: string; skuIds: string[]; writeReady: boolean; graphClient: Pick<M365GraphClient, 'removeLicense'>; actorId?: string; readAssignedLicensesAfterMutation?: () => Promise<string[]>; readLicenseDetailsAfterMutation?: () => Promise<string[]>; readSnapshotAssignedLicensesAfterMutation?: () => Promise<string[]> }
export interface M365LicenseExecutionResult { status: 'EXECUTED' | 'BLOCKED' | 'MUTATION_DISABLED' | 'VERIFICATION_FAILED'; executionRequestId: string; blockers: string[]; warnings: string[]; dryRun?: DryRunResult; verification?: VerificationResult; outcomeProof?: any; driftRule?: any }

const executed = new Set<string>()
export function clearM365LicenseExecutionMemoryForTests() { executed.clear() }

export class M365LicenseExecutionService {
  async execute(request: M365LicenseExecutionRequest): Promise<M365LicenseExecutionResult> {
    const blockers: string[] = []
    const warnings: string[] = []
    if (request.skuIds.length !== 1) blockers.push('Exactly one license is supported.')
    const skuId = request.skuIds[0]
    if (!request.userId || !skuId) blockers.push('Exactly one user and one license are required.')
    const key = `${request.tenantId}:${request.userId}:${skuId}`
    if (executed.has(key)) blockers.push('Duplicate execution blocked for the same tenant/user/license.')
    const eligibility = evaluateM365ExecutionEligibility({ opportunity: request.opportunity, trust: request.trust, economicAssessment: request.opportunity.economicAssessment, snapshot: request.snapshot, approvalState: request.approvalState })
    if (!eligibility.eligible) blockers.push(...eligibility.blockers)
    if (request.approvalState !== 'APPROVED') blockers.push('Approval Authority must be APPROVED before mutation.')
    const dryRun = await runM365LicenseReclaimDryRun({ tenantId: request.tenantId, opportunity: request.opportunity, snapshot: request.snapshot, trust: request.trust, approvalState: request.approvalState, userId: request.userId, skuId, writeReady: request.writeReady })
    if (dryRun.status !== 'READY') blockers.push(...dryRun.blockers)
    if (dryRun.status === 'WARNING') blockers.push(...dryRun.warnings.map((warning) => `Dry run warning blocks execution: ${warning}`))
    if (!request.readAssignedLicensesAfterMutation && !request.readLicenseDetailsAfterMutation && !request.readSnapshotAssignedLicensesAfterMutation) blockers.push('Verification readback is required before live mutation.')
    if (process.env.M365_ENABLE_LIVE_LICENSE_MUTATION !== 'true') blockers.push('MUTATION_DISABLED')
    if (blockers.length) return { status: blockers.includes('MUTATION_DISABLED') ? 'MUTATION_DISABLED' : 'BLOCKED', executionRequestId: request.executionRequestId, blockers: Array.from(new Set(blockers)), warnings, dryRun }
    await request.graphClient.removeLicense({ userId: request.userId, skuId, calledBy: 'M365LicenseExecutionService' })
    executed.add(key)
    await platformEventService.recordExecutionEvent(request.tenantId, 'M365_LICENSE_RECLAIM_EXECUTED', { entityType: 'M365_USER', entityId: request.userId, actorId: request.actorId, sourceSystem: 'm365-license-execution-service', metadata: { executionRequestId: request.executionRequestId, skuId } }).catch(() => undefined)
    await outcomeProofService.upsertProof(request.tenantId, { outcomeId: `m365-${request.executionRequestId}`, recommendationId: String(request.opportunity.id ?? request.opportunity.sourceReferenceId ?? ''), executionRequestId: request.executionRequestId, executionResultId: `result-${request.executionRequestId}`, sourcePlaybook: 'm365-inactive-user-reclaim', domain: 'M365', projectedMonthlySavings: Number(request.opportunity.projectedMonthlySavings ?? 0), projectedAnnualSavings: Number(request.opportunity.projectedAnnualSavings ?? 0), approvedMonthlySavings: Number(request.opportunity.projectedMonthlySavings ?? 0), approvedAnnualSavings: Number(request.opportunity.projectedAnnualSavings ?? 0), executedMonthlySavings: Number(request.opportunity.projectedMonthlySavings ?? 0), executedAnnualSavings: Number(request.opportunity.projectedAnnualSavings ?? 0), proofState: 'EXECUTED', confidenceBand: 'MEDIUM', evidenceSummary: { hasProjectionEvidence: true, hasApprovalEvidence: true, hasExecutionEvidence: true }, proofTimeline: [ { stage: 'PROJECTED', sourceSystem: 'M365_PLAYBOOK', occurredAt: new Date().toISOString(), evidenceRef: `opportunity:${request.opportunity.id}` }, { stage: 'APPROVED', sourceSystem: 'APPROVAL_AUTHORITY', occurredAt: new Date().toISOString(), evidenceRef: `approval:${request.approvalState}` }, { stage: 'EXECUTED', sourceSystem: 'M365_LICENSE_EXECUTION_SERVICE', occurredAt: new Date().toISOString(), evidenceRef: `execution:${request.executionRequestId}` } ] }, 'execution')
    const [currentAssignedSkuIds, currentLicenseDetailSkuIds, refreshedSnapshotAssignedSkuIds] = await Promise.all([request.readAssignedLicensesAfterMutation?.(), request.readLicenseDetailsAfterMutation?.(), request.readSnapshotAssignedLicensesAfterMutation?.()])
    const verification = await m365LicenseVerificationService.verify({ tenantId: request.tenantId, userId: request.userId, skuId, beforeAssignedSkuIds: dryRun.beforeState.assignedLicenses, currentAssignedSkuIds, currentLicenseDetailSkuIds, refreshedSnapshotAssignedSkuIds, projectedMonthlySavings: Number(request.opportunity.projectedMonthlySavings ?? 0), evidenceRefs: [`execution:${request.executionRequestId}`] })
    if (verification.status !== 'VERIFIED') return { status: 'VERIFICATION_FAILED', executionRequestId: request.executionRequestId, blockers: ['Verification failed after mutation.'], warnings, dryRun, verification }
    const outcomeProof = await outcomeProofService.projectFromVerification(request.tenantId, { outcomeId: `m365-${request.executionRequestId}`, recommendationId: String(request.opportunity.id ?? request.opportunity.sourceReferenceId ?? ''), executionRequestId: request.executionRequestId, executionResultId: `result-${request.executionRequestId}`, verificationId: `verification-${request.executionRequestId}`, verificationStatus: 'VERIFIED', projectedMonthlySavings: Number(request.opportunity.projectedMonthlySavings ?? 0), verifiedMonthlySavings: verification.verifiedMonthlySavings, verifiedAnnualSavings: verification.verifiedAnnualSavings, confidenceBand: verification.confidenceBand, evidencePackId: `m365-evidence:${request.executionRequestId}` })
    const driftRule = { driftRuleId: `m365-drift-${request.executionRequestId}`, tenantId: request.tenantId, userId: request.userId, skuId, monitors: ['USER_RECEIVES_SAME_LICENSE_AGAIN', 'USER_BECOMES_ACTIVE_AGAIN'], activeRemediation: false }
    await platformEventService.recordDriftEvent(request.tenantId, 'M365_LICENSE_DRIFT_REGISTERED', { entityType: 'M365_USER', entityId: request.userId, sourceSystem: 'm365-license-execution-service', metadata: driftRule }).catch(() => undefined)
    return { status: 'EXECUTED', executionRequestId: request.executionRequestId, blockers: [], warnings, dryRun, verification, outcomeProof, driftRule }
  }
}

export const m365LicenseExecutionService = new M365LicenseExecutionService()
