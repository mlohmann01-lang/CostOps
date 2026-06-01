import { ApprovalAuthorityError, ApprovalAuthorityService } from '../approvals/approval-authority-service'
import { GovernedRecommendationRepository } from './recommendation-repository'
import { RecommendationGovernanceEventService } from './governance-event-service'

export class RecommendationApprovalError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message) }
}

type SubmitInput = { tenantId: string; recommendationId: string; actorId?: string; actorRole?: string; reason?: string }

export class RecommendationApprovalService {
  private readonly authority: ApprovalAuthorityService
  constructor(repo = new GovernedRecommendationRepository(), events = new RecommendationGovernanceEventService()) {
    this.authority = new ApprovalAuthorityService(repo, events)
  }

  async submitForApproval(input: SubmitInput) {
    try {
      const result = await this.authority.submitForApproval(input.tenantId, 'RECOMMENDATION', input.recommendationId, { actorId: input.actorId, actorRole: input.actorRole, reason: input.reason, duplicateMode: 'ERROR' })
      return { recommendationId: input.recommendationId, workflowId: result.approval.workflowId, approvalState: result.workflow.approvalState, currentStage: result.approval.currentStage, requiredRoles: result.approval.requiredRoles, submittedAt: result.approval.submittedAt, sourceSystem: result.approval.sourceSystem }
    } catch (error) {
      if (error instanceof ApprovalAuthorityError) throw new RecommendationApprovalError(error.code, error.message, error.status)
      throw error
    }
  }
}
