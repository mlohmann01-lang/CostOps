import { RecommendationGovernanceEventService } from "../recommendations/governance-event-service";
import { GovernedRecommendationRepository } from "../recommendations/recommendation-repository";
import { createHash } from "node:crypto";
import type { ApprovalWorkflow } from "../approvals/types";
import { appendUnifiedEvent } from "../events/evidence-timeline";
import { buildExecutionRequest } from "./execution-request-builder";
import { ExecutionRequestRepository } from "./execution-request-repository";

export class ExecutionRequestService {
  constructor(
    private readonly recommendationRepo = new GovernedRecommendationRepository(),
    private readonly eventService = new RecommendationGovernanceEventService(),
    private readonly requestRepo = new ExecutionRequestRepository(),
  ) {}

  async create(tenantId: string, recommendationId: string, requestedBy: string, idempotencyKey: string) {
    const recommendation = await this.recommendationRepo.getByRecommendationId(tenantId, recommendationId);
    if (!recommendation) return null;
    let events: any[] = [];
    try {
      events = await this.eventService.list(tenantId, recommendationId);
    } catch (error) {
      const env = String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? "development").toLowerCase();
      if (env === "production" || env === "staging") throw error;
      events = [];
    }
    const approvalEvents = events.filter((e) => e.eventType === "RECOMMENDATION_APPROVED").map((e) => String(e.id));
    const built = buildExecutionRequest({
      tenantId,
      recommendationId,
      requestedBy,
      idempotencyKey,
      approvalEventIds: approvalEvents,
      recommendation: {
        recommendationState: String(recommendation.recommendationState),
        executionReadiness: recommendation.executionReadiness as any,
        playbookId: String(recommendation.playbookId),
        targetEntityId: String(recommendation.targetEntityId),
        actionType: String(recommendation.actionType),
        actionRiskClass: recommendation.actionRiskClass as any,
        evidencePointers: recommendation.evidencePointers as string[],
      },
    });
    return this.requestRepo.upsert(built);
  }

  private requestId(tenantId: string, recommendationId: string, workflowId: string) {
    return `exec_${createHash("sha256").update(`${tenantId}:${recommendationId}:${workflowId}`).digest("hex").slice(0, 16)}`;
  }

  private platform(playbookId: string) {
    return /M365|COPILOT|LICENSE/i.test(playbookId) ? "M365" : "UNKNOWN";
  }

  async createFromApprovedWorkflow(workflow: ApprovalWorkflow, actorId = "approval-workflow", sourceSystem: "APPROVAL_WORKFLOW" | "LEGACY_APPROVAL_REQUEST" = "APPROVAL_WORKFLOW") {
    if (sourceSystem !== "APPROVAL_WORKFLOW") return null;
    if (workflow.approvalState !== "APPROVED" || workflow.targetType !== "RECOMMENDATION") return null;
    const recommendation = await this.recommendationRepo.getByRecommendationId(workflow.tenantId, workflow.targetId);
    if (!recommendation) return null;
    if (["BLOCKED", "NEVER_ELIGIBLE"].includes(String(recommendation.recommendationState)) || ["BLOCKED", "NEVER_ELIGIBLE"].includes(String(recommendation.executionReadiness))) return null;
    const existing = await this.requestRepo.getByRecommendationId(workflow.tenantId, workflow.targetId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const request = await this.requestRepo.createExecutionRequest({
      requestId: this.requestId(workflow.tenantId, workflow.targetId, workflow.workflowId),
      tenantId: workflow.tenantId,
      recommendationId: workflow.targetId,
      approvalWorkflowId: workflow.workflowId,
      actionType: String(recommendation.actionType),
      playbookId: String(recommendation.playbookId),
      platform: this.platform(String(recommendation.playbookId)),
      riskClass: recommendation.actionRiskClass as any,
      readinessState: "PENDING_DRY_RUN",
      executionMode: recommendation.actionRiskClass === "A" ? "AUTO" : "SUPERVISED",
      rollbackCoverage: recommendation.actionRiskClass === "A" ? "PARTIAL" : "FULL",
      projectedMonthlySavings: Number(recommendation.projectedMonthlySavings ?? 0),
      projectedAnnualSavings: Number(recommendation.projectedAnnualSavings ?? 0),
      createdAt: now,
      createdByWorkflowId: workflow.workflowId,
      governanceStatus: "VALID",
      metadata: { targetEntityId: recommendation.targetEntityId, evidencePointers: recommendation.evidencePointers, requestedBy: actorId },
    });
    await this.recommendationRepo.linkExecutionRequest(workflow.tenantId, workflow.targetId, { executionRequestId: request.requestId, executionRequestCreatedAt: request.createdAt, executionRequestState: request.readinessState });
    await this.eventService.emit({ tenantId: workflow.tenantId, recommendationId: workflow.targetId, eventType: "EXECUTION_REQUEST_CREATED", actorId, actorRole: "SYSTEM", eventReason: "Approved workflow created execution request", afterState: String(recommendation.recommendationState), afterReadiness: String(recommendation.executionReadiness), evidenceSnapshot: recommendation.evidencePointers as unknown[], approvalSnapshot: { workflowId: workflow.workflowId, executionRequestId: request.requestId } });
    appendUnifiedEvent({ eventId: `${request.requestId}:EXECUTION_REQUEST_CREATED:${request.createdAt}`, tenantId: workflow.tenantId, entityType: "EXECUTION_REQUEST", entityId: request.requestId, eventType: "EXECUTION_REQUEST_CREATED", eventCategory: "EXECUTION", actorId, actorRole: "SYSTEM", eventReason: `Execution request created for ${workflow.targetId}`, beforeState: "", afterState: request.readinessState, evidenceSnapshot: recommendation.evidencePointers ?? [], sourceSystem: "execution-request-service", createdAt: request.createdAt });
    return request;
  }

  async list(tenantId: string) { return this.requestRepo.listExecutionRequestsByTenant(tenantId); }
  async get(tenantId: string, executionRequestId: string) { return this.requestRepo.getExecutionRequest(tenantId, executionRequestId); }

  async cancel(tenantId: string, executionRequestId: string) {
    const existing = await this.requestRepo.getByExecutionRequestId(tenantId, executionRequestId);
    if (!existing) return null;
    if (existing.executionState !== "REQUESTED") return existing;
    return this.requestRepo.updateState(tenantId, executionRequestId, "CANCELLED");
  }
}
