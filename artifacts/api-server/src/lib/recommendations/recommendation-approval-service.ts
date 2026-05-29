import { createWorkflow } from '../approvals/approval-workflow-engine'
import { findActiveApprovalWorkflow, saveApprovalWorkflow } from '../approvals/approval-workflow-store'
import { appendUnifiedEvent } from '../events/evidence-timeline'
import { normalizeApprovalWorkflowEvent } from '../events/event-normalizer'
import { GovernedRecommendationRepository } from './recommendation-repository'
import { RecommendationGovernanceEventService } from './governance-event-service'

export class RecommendationApprovalError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message) }
}

type SubmitInput = { tenantId: string; recommendationId: string; actorId?: string; actorRole?: string; reason?: string }

const inactiveApprovalStates = new Set(['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'])

function currentStageName(workflow: any) {
  return workflow.approvalStages?.[workflow.currentStage]?.stageName ?? workflow.approvalStages?.[workflow.currentStage]?.stageId ?? 'Approval'
}

export class RecommendationApprovalService {
  constructor(private readonly repo = new GovernedRecommendationRepository(), private readonly events = new RecommendationGovernanceEventService()) {}

  async submitForApproval(input: SubmitInput) {
    const actorId = input.actorId ?? 'operator'
    const actorRole = input.actorRole ?? 'OPERATOR'
    const recommendation = await this.repo.getByRecommendationId(input.tenantId, input.recommendationId)
    if (!recommendation) throw new RecommendationApprovalError('NOT_FOUND', 'Recommendation not found', 404)
    if (String(recommendation.tenantId) !== input.tenantId) throw new RecommendationApprovalError('NOT_FOUND', 'Recommendation not found', 404)
    if (['BLOCKED', 'NEVER_ELIGIBLE'].includes(String(recommendation.recommendationState)) || ['BLOCKED', 'NEVER_ELIGIBLE'].includes(String(recommendation.executionReadiness))) throw new RecommendationApprovalError('INVALID_RECOMMENDATION_STATE', 'Blocked recommendations cannot be submitted for approval', 422)
    const readiness = String(recommendation.executionReadiness)
    if (!['APPROVAL_REQUIRED', 'MANUAL_ONLY_APPROVAL_ALLOWED'].includes(readiness)) throw new RecommendationApprovalError('INVALID_RECOMMENDATION_STATE', 'Recommendation is not awaiting approval', 422)
    if (!Array.isArray(recommendation.evidencePointers) || recommendation.evidencePointers.length === 0) throw new RecommendationApprovalError('MISSING_EVIDENCE', 'Recommendation requires evidence before approval submission', 422)
    if ((!Array.isArray(recommendation.requiredApprovals) || recommendation.requiredApprovals.length === 0) && !recommendation.actionRiskClass) throw new RecommendationApprovalError('MISSING_APPROVAL_POLICY', 'Recommendation requires approval policy metadata', 422)
    if (recommendation.approvalWorkflowId && !inactiveApprovalStates.has(String(recommendation.approvalState))) throw new RecommendationApprovalError('APPROVAL_WORKFLOW_ALREADY_ACTIVE', 'Recommendation already has an active approval workflow', 409)
    const active = findActiveApprovalWorkflow(input.tenantId, 'RECOMMENDATION', input.recommendationId)
    if (active) throw new RecommendationApprovalError('APPROVAL_WORKFLOW_ALREADY_ACTIVE', 'Recommendation already has an active approval workflow', 409)

    const workflow = saveApprovalWorkflow(createWorkflow({ tenantId: input.tenantId, targetType: 'RECOMMENDATION', targetId: input.recommendationId, workflowName: `${recommendation.actionType} approval`, riskClass: String(recommendation.actionRiskClass), delegatedApprovalAllowed: true, separationOfDutiesRequired: true }))
    const submittedAt = workflow.createdAt
    const currentStage = currentStageName(workflow)
    const linked = await this.repo.linkApprovalWorkflow(input.tenantId, input.recommendationId, { approvalWorkflowId: workflow.workflowId, approvalSubmittedAt: submittedAt, approvalState: workflow.approvalState, currentApprovalStage: currentStage })
    if (!linked) throw new RecommendationApprovalError('NOT_FOUND', 'Recommendation not found', 404)

    await this.events.emit({ tenantId: input.tenantId, recommendationId: input.recommendationId, eventType: 'RECOMMENDATION_SUBMITTED_FOR_APPROVAL', actorId, actorRole, eventReason: input.reason ?? 'Submitted to approval workflow', beforeState: String(recommendation.recommendationState), afterState: String(linked.recommendationState), beforeReadiness: String(recommendation.executionReadiness), afterReadiness: String(linked.executionReadiness), evidenceSnapshot: linked.evidencePointers as unknown[], approvalSnapshot: { workflowId: workflow.workflowId, approvalState: workflow.approvalState, currentStage } })
    appendUnifiedEvent({ eventId: `${input.recommendationId}:RECOMMENDATION_SUBMITTED_FOR_APPROVAL:${submittedAt}`, tenantId: input.tenantId, entityType: 'RECOMMENDATION', entityId: input.recommendationId, eventType: 'RECOMMENDATION_SUBMITTED_FOR_APPROVAL', eventCategory: 'RECOMMENDATION', actorId, actorRole, eventReason: input.reason ?? 'Submitted to approval workflow', beforeState: String(recommendation.recommendationState), afterState: String(linked.recommendationState), evidenceSnapshot: linked.evidencePointers ?? [], sourceSystem: 'recommendation-approval-service', createdAt: submittedAt })
    appendUnifiedEvent({ eventId: `${workflow.workflowId}:APPROVAL_WORKFLOW_CREATED:${submittedAt}`, tenantId: input.tenantId, entityType: 'APPROVAL_WORKFLOW', entityId: workflow.workflowId, eventType: 'APPROVAL_WORKFLOW_CREATED', eventCategory: 'APPROVAL', actorId, actorRole, eventReason: `Approval workflow created for ${input.recommendationId}`, beforeState: '', afterState: workflow.approvalState, evidenceSnapshot: linked.evidencePointers ?? [], sourceSystem: 'recommendation-approval-service', createdAt: submittedAt })
    workflow.auditEvents.forEach((event) => appendUnifiedEvent(normalizeApprovalWorkflowEvent({ tenantId: input.tenantId, workflowId: workflow.workflowId, ...event })))

    return { recommendationId: input.recommendationId, workflowId: workflow.workflowId, approvalState: workflow.approvalState, currentStage, requiredRoles: workflow.requiredRoles, submittedAt }
  }
}
