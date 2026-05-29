/*
 Phase 5 dry-run bridge audit:
 - dry-run-simulator currently supports REMOVE_LICENSE and RECLAIM_COPILOT_LICENSE, with RIGHTSIZE_LICENSE returning a controlled review/block result.
 - ExecutionRequestDryRunRepository persists POST results and latest() returns the most recent tenant-scoped result for GET.
 - This service adds the missing bridge: operator-triggered activation, readiness updates, and governance/evidence timeline events.
 - It intentionally performs no live execution, no dry-run auto-triggering, and no connector mutation.
*/
import { RecommendationGovernanceEventRepository } from '../recommendations/governance-event-repository'
import { RecommendationGovernanceEventService } from '../recommendations/governance-event-service'
import { GovernedRecommendationRepository } from '../recommendations/recommendation-repository'
import { appendUnifiedEvent } from '../events/evidence-timeline'
import { ExecutionRequestRepository } from './execution-request-repository'
import { ExecutionDryRunRepository } from './dry-run-repository'
import { simulateExecutionRequest, type DryRunState } from './dry-run-simulator'
import type { ExecutionRequestV1 } from './types'

export class ExecutionRequestDryRunError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message) }
}

type NormalizedDryRun = {
  dryRunId: string
  executionRequestId: string
  recommendationId: string
  tenantId: string
  actionType: string
  simulationState: DryRunState
  simulatedActions: unknown[]
  impactedEntities: unknown[]
  projectedSavingsValidated: number
  validationWarnings: string[]
  validationErrors: string[]
  rollbackPlan: Record<string, unknown>
  rollbackSupported: boolean
  policyBlocks: string[]
  preflightResults: unknown[]
  evidencePointers: string[]
  simulatedAt: string
}

const dryRunEligible = new Set(['PENDING_DRY_RUN', 'READY_FOR_DRY_RUN'])
const eventEnv = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase()
const defaultEventRepo = (eventEnv === 'production' || eventEnv === 'staging') ? new RecommendationGovernanceEventRepository() : new RecommendationGovernanceEventRepository({ storageMode: 'memory' })

function nextReadiness(state: string): ExecutionRequestV1['readinessState'] | 'REQUIRES_REVIEW' {
  if (state === 'READY_FOR_EXECUTION') return 'READY_FOR_EXECUTION'
  if (state === 'BLOCKED' || state === 'INVALID') return 'DRY_RUN_BLOCKED'
  return 'REQUIRES_REVIEW'
}

function normalize(row: any): NormalizedDryRun | null {
  if (!row) return null
  return {
    dryRunId: String(row.dryRunId ?? row.simulationId),
    executionRequestId: String(row.executionRequestId),
    recommendationId: String(row.recommendationId ?? row.metadata?.recommendationId ?? ''),
    tenantId: String(row.tenantId),
    actionType: String(row.actionType ?? row.metadata?.actionType ?? ''),
    simulationState: String(row.simulationState) as DryRunState,
    simulatedActions: row.simulatedActions ?? [],
    impactedEntities: row.impactedEntities ?? [],
    projectedSavingsValidated: Number(row.projectedSavingsValidated ?? 0),
    validationWarnings: row.validationWarnings ?? [],
    validationErrors: row.validationErrors ?? [],
    rollbackPlan: row.rollbackPlan ?? {},
    rollbackSupported: Boolean(row.rollbackSupported),
    policyBlocks: row.policyBlocks ?? [],
    preflightResults: row.preflightResults ?? [],
    evidencePointers: row.evidencePointers ?? [],
    simulatedAt: new Date(row.simulatedAt ?? row.createdAt ?? Date.now()).toISOString(),
  }
}

export class ExecutionRequestDryRunService {
  constructor(
    private readonly requests = new ExecutionRequestRepository(),
    private readonly recommendations = new GovernedRecommendationRepository(),
    private readonly events = new RecommendationGovernanceEventService(defaultEventRepo),
    private readonly dryRuns = new ExecutionDryRunRepository(),
  ) {}

  async run(tenantId: string, executionRequestId: string) {
    const request = await this.requests.getExecutionRequest(tenantId, executionRequestId)
    if (!request) throw new ExecutionRequestDryRunError('NOT_FOUND', 'Execution request not found', 404)
    if (!dryRunEligible.has(request.readinessState)) throw new ExecutionRequestDryRunError('DRY_RUN_NOT_ELIGIBLE', 'Execution request is not pending dry run', 422)
    const recommendation = await this.recommendations.getByRecommendationId(tenantId, request.recommendationId)
    if (!recommendation) throw new ExecutionRequestDryRunError('RECOMMENDATION_NOT_FOUND', 'Linked recommendation not found', 404)
    if (recommendation.executionRequestId && recommendation.executionRequestId !== request.requestId) throw new ExecutionRequestDryRunError('EXECUTION_REQUEST_LINK_MISMATCH', 'Recommendation is linked to a different execution request', 422)
    if (['BLOCKED', 'NEVER_ELIGIBLE'].includes(String(recommendation.recommendationState)) || ['BLOCKED', 'NEVER_ELIGIBLE'].includes(String(recommendation.executionReadiness))) throw new ExecutionRequestDryRunError('RECOMMENDATION_BLOCKED', 'Recommendation is blocked', 422)

    const startedAt = new Date().toISOString()
    appendUnifiedEvent({ eventId: `${request.requestId}:DRY_RUN_STARTED:${startedAt}`, tenantId, entityType: 'EXECUTION_REQUEST', entityId: request.requestId, eventType: 'DRY_RUN_STARTED', eventCategory: 'EXECUTION', actorId: 'operator', actorRole: 'OPERATOR', eventReason: 'Operator started execution request dry run', beforeState: request.readinessState, afterState: request.readinessState, evidenceSnapshot: recommendation.evidencePointers ?? [], sourceSystem: 'execution-request-dry-run-service', createdAt: startedAt })

    const evidencePointers = recommendation.evidencePointers as string[]
    const approvalIds = [request.approvalWorkflowId].filter(Boolean)
    const sim = simulateExecutionRequest({
      simulationId: `dryrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      executionRequestId: request.requestId,
      actionType: request.actionType,
      executionState: 'REQUESTED',
      expiresAt: new Date(Date.now() + 3600000),
      recommendationState: 'EXECUTION_READY',
      lifecycleState: String(recommendation.discoveryLifecycleState),
      evidencePointers,
      approvalEventIds: approvalIds,
      projectedMonthlySavings: Number(recommendation.projectedMonthlySavings ?? request.projectedMonthlySavings ?? 0),
      targetEntityId: String(recommendation.targetEntityId ?? request.metadata?.targetEntityId ?? request.recommendationId),
      policyBlocks: Array.isArray(request.metadata?.policyBlocks) ? request.metadata.policyBlocks as string[] : [],
    })
    const dryRunId = sim.simulationId
    const saved = await this.dryRuns.create({ ...sim, dryRunId, recommendationId: request.recommendationId, actionType: request.actionType, evidencePointers, tenantId, simulatedAt: new Date(sim.simulatedAt) })
    const dryRun = normalize(saved)!
    const readinessState = nextReadiness(dryRun.simulationState)
    const policyBlocksSummary = dryRun.policyBlocks.length ? `${dryRun.policyBlocks.length} policy block${dryRun.policyBlocks.length === 1 ? '' : 's'}` : dryRun.validationErrors.length ? `${dryRun.validationErrors.length} validation error${dryRun.validationErrors.length === 1 ? '' : 's'}` : ''
    await this.requests.updateExecutionRequest(tenantId, request.requestId, { readinessState: readinessState, rollbackSupported: dryRun.rollbackSupported, metadata: { ...(request.metadata ?? {}), latestDryRunState: dryRun.simulationState, latestDryRunId: dryRun.dryRunId, rollbackSupported: dryRun.rollbackSupported, policyBlocksSummary, validationWarnings: dryRun.validationWarnings, validationErrors: dryRun.validationErrors } })
    await this.events.emit({ tenantId, recommendationId: request.recommendationId, eventType: dryRun.simulationState === 'READY_FOR_EXECUTION' ? 'DRY_RUN_COMPLETED' : 'DRY_RUN_BLOCKED', actorId: 'operator', actorRole: 'OPERATOR', eventReason: dryRun.simulationState === 'READY_FOR_EXECUTION' ? 'Dry run completed successfully' : 'Dry run blocked or requires review', afterState: String(readinessState), evidenceSnapshot: evidencePointers, approvalSnapshot: { executionRequestId: request.requestId, dryRunId: dryRun.dryRunId } })
    appendUnifiedEvent({ eventId: `${request.requestId}:${dryRun.simulationState === 'READY_FOR_EXECUTION' ? 'DRY_RUN_COMPLETED' : 'DRY_RUN_BLOCKED'}:${dryRun.simulatedAt}`, tenantId, entityType: 'EXECUTION_REQUEST', entityId: request.requestId, eventType: dryRun.simulationState === 'READY_FOR_EXECUTION' ? 'DRY_RUN_COMPLETED' : 'DRY_RUN_BLOCKED', eventCategory: 'EXECUTION', actorId: 'operator', actorRole: 'OPERATOR', eventReason: dryRun.simulationState === 'READY_FOR_EXECUTION' ? 'Dry run completed successfully' : 'Dry run blocked or requires review', beforeState: request.readinessState, afterState: String(readinessState), evidenceSnapshot: evidencePointers, sourceSystem: 'execution-request-dry-run-service', createdAt: dryRun.simulatedAt })
    return { executionRequestId: request.requestId, readinessState, dryRun }
  }

  async getLatest(tenantId: string, executionRequestId: string) {
    const request = await this.requests.getExecutionRequest(tenantId, executionRequestId)
    if (!request) throw new ExecutionRequestDryRunError('NOT_FOUND', 'Execution request not found', 404)
    return { executionRequestId: request.requestId, dryRun: normalize(await this.dryRuns.latest(tenantId, request.requestId)) }
  }
}
