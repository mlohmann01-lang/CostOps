/*
 Phase 7A outcome verification audit:
 - outcome-verifier accepts evidence-shaped M365 remove-license inputs and returns state/savings fields.
 - execution_outcomes persists verification results; this service adds tenant-scoped loading by executionResultId and upserts the latest result.
 - POST /execution-results/:id/verify is operator-triggered only; GET returns the latest persisted outcome or null.
 - Verification is evidence-only: no connector mutation, rollback, remediation, or live license writes occur here.
*/
import { RecommendationGovernanceEventRepository } from '../recommendations/governance-event-repository'
import { RecommendationGovernanceEventService } from '../recommendations/governance-event-service'
import { ExecutionRequestRepository } from '../execution/execution-request-repository'
import { ExecutionResultRecorder } from '../execution/execution-result-recorder'
import { GovernedRecommendationRepository } from '../recommendations/recommendation-repository'
import { appendUnifiedEvent } from '../events/evidence-timeline'
import { verifyM365RemoveLicense } from './outcome-verifier'
import { ExecutionOutcomeRepository } from './execution-outcome-repository'
import { outcomeProjectionService } from './outcome-projection-service'
import { monitoredOutcomeService } from '../drift/monitored-outcome-service'
import { outcomeProofService } from './outcome-proof-service'
import { decisionLifecycleBridge } from '../decision-authority/decision-lifecycle-bridge'

export class ExecutionOutcomeVerificationError extends Error { constructor(public readonly code:string, message:string, public readonly status=400){ super(message) } }

type ParsedEvidence = { userId?: string; removedSku?: string; beforeSkus?: string[]; afterSkus?: string[]; incomplete: boolean; mismatch: boolean }
const env = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase()
const defaultEventRepo = (env === 'production' || env === 'staging') ? new RecommendationGovernanceEventRepository() : new RecommendationGovernanceEventRepository({ storageMode: 'memory' })
const supported = new Set(['REMOVE_LICENSE'])

function parseEvidence(evidence: unknown[], fallbackUser: string): ParsedEvidence {
  const strings = evidence.map(String)
  const before = strings.find((item) => item.startsWith('m365:license_before:'))
  const after = strings.find((item) => item.startsWith('m365:license_after:'))
  const action = strings.find((item) => item.startsWith('m365:remove_license:'))
  const userId = before?.split(':')[2] ?? after?.split(':')[2] ?? action?.split(':')[2] ?? fallbackUser
  const beforeSku = before?.split(':sku:')[1]
  const afterSku = after?.split(':sku:')[1]
  const removedSku = beforeSku && beforeSku !== 'none' ? beforeSku : undefined
  const beforeSkus = beforeSku && beforeSku !== 'none' ? beforeSku.split(',').filter(Boolean) : []
  const afterSkus = afterSku && afterSku !== 'none' ? afterSku.split(',').filter(Boolean) : []
  const users = [before, after, action].filter(Boolean).map((item) => item!.split(':')[2]).filter(Boolean)
  return { userId, removedSku, beforeSkus, afterSkus, incomplete: !before || !after || !removedSku, mismatch: users.some((id) => id !== userId) }
}

function stateEvent(state: string) {
  if (state === 'VERIFIED') return 'OUTCOME_VERIFIED'
  if (state === 'PARTIALLY_VERIFIED') return 'OUTCOME_PARTIALLY_VERIFIED'
  return 'OUTCOME_VERIFICATION_FAILED'
}

function normalize(row: any) {
  if (!row) return null
  return { outcomeId: String(row.outcomeId), executionResultId: String(row.executionResultId), executionRequestId: String(row.executionRequestId), recommendationId: row.recommendationId ?? null, tenantId: String(row.tenantId), verificationState: String(row.verificationState), projectedMonthlySavings: Number(row.projectedMonthlySavings ?? 0), verifiedMonthlySavings: Number(row.verifiedMonthlySavings ?? 0), projectedAnnualSavings: Number(row.projectedAnnualSavings ?? 0), verifiedAnnualSavings: Number(row.verifiedAnnualSavings ?? 0), savingsVariance: Number(row.savingsVariance ?? 0), rollbackAvailable: Boolean(row.rollbackAvailable), rollbackReference: row.rollbackReference ?? null, verificationEvidence: row.verificationEvidence ?? {}, verifiedAt: row.verifiedAt ? new Date(row.verifiedAt).toISOString() : null, lastCheckedAt: row.lastCheckedAt ? new Date(row.lastCheckedAt).toISOString() : null }
}

export class ExecutionOutcomeVerificationService {
  constructor(
    private readonly results = new ExecutionResultRecorder(),
    private readonly requests = new ExecutionRequestRepository(),
    private readonly recommendations = new GovernedRecommendationRepository(),
    private readonly outcomes = new ExecutionOutcomeRepository(),
    private readonly events = new RecommendationGovernanceEventService(defaultEventRepo),
  ) {}

  async verify(tenantId: string, executionResultId: string, actorId = 'operator') {
    const result = await this.results.getByResultId(tenantId, executionResultId)
    if (!result) throw new ExecutionOutcomeVerificationError('NOT_FOUND', 'Execution result not found', 404)
    const request = await this.requests.getExecutionRequest(tenantId, String(result.executionRequestId))
    if (!request) throw new ExecutionOutcomeVerificationError('EXECUTION_REQUEST_NOT_FOUND', 'Linked execution request not found', 404)
    const recommendation = await this.recommendations.getByRecommendationId(tenantId, request.recommendationId)
    const startedAt = new Date().toISOString()
    appendUnifiedEvent({ eventId: `${executionResultId}:OUTCOME_VERIFICATION_STARTED:${startedAt}`, tenantId, entityType: 'EXECUTION_RESULT', entityId: executionResultId, eventType: 'OUTCOME_VERIFICATION_STARTED', eventCategory: 'OUTCOME', actorId, actorRole: 'OPERATOR', eventReason: 'Operator started outcome verification', beforeState: String(result.executionState), afterState: 'VERIFYING', evidenceSnapshot: result.executionEvidence ?? [], sourceSystem: 'execution-outcome-verification-service', createdAt: startedAt })

    if (!['EXECUTED', 'COMPLETED'].includes(String(result.executionState))) throw new ExecutionOutcomeVerificationError('EXECUTION_NOT_COMPLETED', 'Execution result is not completed', 422)
    const projectedMonthly = Number(request.projectedMonthlySavings ?? recommendation?.projectedMonthlySavings ?? 0)
    const parsed: ParsedEvidence = parseEvidence(result.executionEvidence as unknown[], String((request.metadata as any)?.targetEntityId ?? recommendation?.targetEntityId ?? request.recommendationId))
    let verificationState = 'PARTIALLY_VERIFIED'
    let verifiedMonthly = projectedMonthly * 0.5
    let failureReason = ''
    if (!supported.has(request.actionType)) { verificationState = 'VERIFICATION_FAILED'; verifiedMonthly = 0; failureReason = 'UNSUPPORTED_ACTION' }
    else if (parsed.mismatch) { verificationState = 'VERIFICATION_FAILED'; verifiedMonthly = 0; failureReason = 'TARGET_USER_MISMATCH' }
    else if (parsed.incomplete) { verificationState = 'PARTIALLY_VERIFIED'; verifiedMonthly = projectedMonthly * 0.5; failureReason = 'INCOMPLETE_EVIDENCE' }
    else if (!parsed.removedSku || !(parsed.beforeSkus ?? []).includes(parsed.removedSku)) { verificationState = 'VERIFICATION_FAILED'; verifiedMonthly = 0; failureReason = 'TARGET_SKU_NOT_PRESENT_BEFORE' }
    else if ((parsed.afterSkus ?? []).includes(parsed.removedSku)) { verificationState = 'VERIFICATION_FAILED'; verifiedMonthly = 0; failureReason = 'TARGET_SKU_STILL_ASSIGNED' }
    else { verificationState = 'VERIFIED'; verifiedMonthly = projectedMonthly }

    const verifier = supported.has(request.actionType) ? verifyM365RemoveLicense({ actionType: 'REMOVE_LICENSE', tenantId, targetUserValid: !parsed.mismatch, removedSkuIds: parsed.removedSku ? [parsed.removedSku] : [], currentAssignedSkuIds: parsed.afterSkus ?? [], excludedAccountModified: false, rollbackAvailable: Boolean(result.rollbackReference), rollbackReference: String(result.rollbackReference ?? ''), projectedMonthlySavings: projectedMonthly, verifiedMonthlySavings: verifiedMonthly, policyViolationIntroduced: false }) : null
    const finalState = verificationState === 'VERIFIED' && verifier ? verifier.verificationState : verificationState
    const now = new Date()
    const outcome = await this.outcomes.upsert({ outcomeId: `outcome_${executionResultId}`, tenantId, executionResultId, executionRequestId: request.requestId, recommendationId: request.recommendationId, verificationState: finalState, projectedMonthlySavings: projectedMonthly, verifiedMonthlySavings: verifiedMonthly, projectedAnnualSavings: projectedMonthly * 12, verifiedAnnualSavings: verifiedMonthly * 12, savingsVariance: verifiedMonthly - projectedMonthly, driftDetected: false, driftReason: null, rollbackAvailable: Boolean(result.rollbackReference), rollbackReference: String(result.rollbackReference ?? ''), verificationEvidence: { ...(verifier?.verificationEvidence ?? {}), userId: parsed.userId, removedSkuIds: parsed.removedSku ? [parsed.removedSku] : [], beforeAssignedSkuIds: parsed.beforeSkus ?? [], afterAssignedSkuIds: parsed.afterSkus ?? [], failureReason, savingsConfidence: finalState === 'VERIFIED' ? 'VERIFIED' : finalState === 'PARTIALLY_VERIFIED' ? 'PARTIAL' : 'FAILED' }, verifiedAt: now, lastCheckedAt: now })
    const projection = outcomeProjectionService.project(outcome)
    try {
      await outcomeProofService.projectFromExecutionResult(tenantId, { ...result, recommendationId: request.recommendationId, projectedMonthlySavings: projectedMonthly, executedMonthlySavings: projectedMonthly })
      await outcomeProofService.projectFromVerification(tenantId, outcome)
    } catch (err) {
      appendUnifiedEvent({ eventId: `${executionResultId}:OUTCOME_PROOF_PROJECTION_FAILED:${now.toISOString()}`, tenantId, entityType: 'EXECUTION_RESULT', entityId: executionResultId, eventType: 'OUTCOME_PROOF_UPDATED', eventCategory: 'OUTCOME', actorId, actorRole: 'OPERATOR', eventReason: `Outcome proof projection failed: ${(err as Error).message}`, beforeState: 'UNKNOWN', afterState: finalState, evidenceSnapshot: result.executionEvidence ?? [], sourceSystem: 'outcome-proof-authority', createdAt: now.toISOString() })
    }
    if (finalState === 'VERIFIED') monitoredOutcomeService.register({ outcomeId: (outcome as any).outcomeId, tenantId, entityType: 'M365_USER', entityId: String((outcome as any).verificationEvidence?.userId ?? request.recommendationId), verificationDate: projection.verificationDate, lastCheckDate: projection.verificationDate })
    await this.requests.updateExecutionRequest(tenantId, request.requestId, { metadata: { ...(request.metadata ?? {}), latestOutcomeId: (outcome as any).outcomeId, latestOutcomeState: finalState, verifiedMonthlySavings: verifiedMonthly, savingsVariance: verifiedMonthly - projectedMonthly } })
    await this.events.emit({ tenantId, recommendationId: request.recommendationId, eventType: stateEvent(finalState) as any, actorId, actorRole: 'OPERATOR', eventReason: failureReason || 'Outcome verification completed', afterState: finalState, evidenceSnapshot: result.executionEvidence as unknown[], approvalSnapshot: { executionRequestId: request.requestId, executionResultId, outcomeId: (outcome as any).outcomeId } })
    appendUnifiedEvent({ eventId: `${executionResultId}:${stateEvent(finalState)}:${now.toISOString()}`, tenantId, entityType: 'EXECUTION_RESULT', entityId: executionResultId, eventType: stateEvent(finalState), eventCategory: 'OUTCOME', actorId, actorRole: 'OPERATOR', eventReason: failureReason || 'Outcome verification completed', beforeState: 'VERIFYING', afterState: finalState, evidenceSnapshot: result.executionEvidence ?? [], sourceSystem: 'execution-outcome-verification-service', createdAt: now.toISOString() })
    try {
      await decisionLifecycleBridge.recordOutcomeVerification({ tenantId, recommendationId: String(request.recommendationId), outcomeId: String((outcome as any).outcomeId), verified: finalState === 'VERIFIED' })
    } catch {
      // Decision Authority is additive; failures here must never block outcome verification.
    }
    return { executionResultId, outcome: normalize(outcome) }
  }

  async getLatest(tenantId: string, executionResultId: string) { return { executionResultId, outcome: normalize(await this.outcomes.latest(tenantId, executionResultId)) } }
}
