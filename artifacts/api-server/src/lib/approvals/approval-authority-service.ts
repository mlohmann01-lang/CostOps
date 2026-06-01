import { and, desc, eq } from "drizzle-orm";
import { approvalRequestsTable, db } from "@workspace/db";
import { approveWorkflow, createWorkflow, rejectWorkflow } from "./approval-workflow-engine";
import { findActiveApprovalWorkflow, getApprovalWorkflow, listApprovalWorkflows, saveApprovalWorkflow, updateApprovalWorkflow } from "./approval-workflow-store";
import type { ApprovalWorkflow } from "./types";
import type { ApprovalAuthorityStatus, ApprovalAuthorityTargetType, CanonicalApproval, CanonicalApprovalState } from "./approval-authority-types";
import { platformEventService } from "../events/platform-event-service";
import { normalizeApprovalWorkflowEvent } from "../events/event-normalizer";
import { ExecutionRequestService } from "../execution/execution-request-service";
import { RecommendationGovernanceEventService } from "../recommendations/governance-event-service";
import { GovernedRecommendationRepository } from "../recommendations/recommendation-repository";

export class ApprovalAuthorityError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) { super(message); }
}

type Actor = { actorId?: string; actorRole?: string; actorRoles?: string[] };
type SubmitInput = Actor & { reason?: string; workflowName?: string; riskClass?: string; duplicateMode?: "ERROR" | "RETURN_EXISTING" };

const inactiveWorkflowStates = new Set(["APPROVED", "REJECTED", "EXPIRED", "CANCELLED"]);

function currentStageName(workflow: ApprovalWorkflow) {
  return workflow.approvalStages?.[workflow.currentStage]?.stageName ?? workflow.approvalStages?.[workflow.currentStage]?.stageId ?? "Approval";
}

function canonicalState(state: string | undefined): CanonicalApprovalState {
  if (state === "APPROVED") return "APPROVED";
  if (state === "REJECTED") return "REJECTED";
  if (state === "EXPIRED") return "EXPIRED";
  if (state === "CANCELLED") return "CANCELLED";
  if (state === "PENDING_APPROVAL" || state === "PARTIALLY_APPROVED" || state === "ESCALATED") return "PENDING";
  return "NOT_SUBMITTED";
}

function approvers(workflow: ApprovalWorkflow): CanonicalApproval["approvers"] {
  return workflow.approvalStages.flatMap((stage) => stage.approvals.map((approval) => ({ actorId: approval.actorId, actorRole: approval.role, approvedAt: approval.approvedAt, decision: "APPROVED" as const })));
}

export function workflowToCanonicalApproval(workflow: ApprovalWorkflow): CanonicalApproval {
  const state = canonicalState(workflow.approvalState);
  return {
    approvalId: workflow.workflowId,
    tenantId: workflow.tenantId,
    targetType: workflow.targetType as ApprovalAuthorityTargetType,
    targetId: workflow.targetId,
    workflowId: workflow.workflowId,
    approvalState: state,
    currentStage: inactiveWorkflowStates.has(workflow.approvalState) ? undefined : currentStageName(workflow),
    requiredRoles: workflow.requiredRoles,
    approvers: approvers(workflow),
    submittedAt: workflow.createdAt,
    decidedAt: ["APPROVED", "REJECTED"].includes(state) ? workflow.updatedAt : undefined,
    expiresAt: workflow.approvalExpiryAt,
    sourceSystem: "APPROVAL_WORKFLOW",
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
  };
}

function statusFromCanonical(targetType: ApprovalAuthorityTargetType, targetId: string, approval?: CanonicalApproval): ApprovalAuthorityStatus {
  const state = approval?.approvalState ?? "NOT_SUBMITTED";
  return {
    targetType,
    targetId,
    approvalState: state,
    workflowId: approval?.workflowId,
    currentStage: approval?.currentStage,
    canApprove: state === "PENDING" && approval?.sourceSystem === "APPROVAL_WORKFLOW",
    canReject: state === "PENDING" && approval?.sourceSystem === "APPROVAL_WORKFLOW",
    canEscalate: state === "PENDING" && approval?.sourceSystem === "APPROVAL_WORKFLOW",
    blockingReasons: state === "NOT_SUBMITTED" ? ["APPROVAL_NOT_SUBMITTED"] : approval?.sourceSystem === "LEGACY_APPROVAL_REQUEST" ? ["LEGACY_APPROVAL_REQUEST_READ_ONLY"] : [],
    sourceSystem: approval?.sourceSystem,
  };
}

function canonicalEventName(eventType: string, approved = false) {
  if (approved || eventType === "APPROVAL_GRANTED") return "APPROVAL_APPROVED";
  return eventType;
}

export class ApprovalAuthorityService {
  constructor(
    private readonly recommendationRepo = new GovernedRecommendationRepository(),
    private readonly recommendationEvents = new RecommendationGovernanceEventService(),
    private readonly executionRequests = new ExecutionRequestService(undefined, recommendationEvents),
  ) {}

  async getApprovalStatus(tenantId: string, targetType: ApprovalAuthorityTargetType, targetId: string): Promise<ApprovalAuthorityStatus> {
    const approval = await this.getCanonicalApproval(tenantId, targetType, targetId);
    return statusFromCanonical(targetType, targetId, approval ?? undefined);
  }

  async submitForApproval(tenantId: string, targetType: ApprovalAuthorityTargetType, targetId: string, input: SubmitInput = {}) {
    if (targetType === "RECOMMENDATION") await this.validateRecommendationSubmission(tenantId, targetId);
    const active = findActiveApprovalWorkflow(tenantId, targetType, targetId);
    if (active) {
      if (input.duplicateMode === "RETURN_EXISTING") return { approval: workflowToCanonicalApproval(active), workflow: active, existing: true };
      throw new ApprovalAuthorityError("APPROVAL_WORKFLOW_ALREADY_ACTIVE", "Target already has an active approval workflow", 409);
    }
    const recommendation = targetType === "RECOMMENDATION" ? await this.recommendationRepo.getByRecommendationId(tenantId, targetId) : null;
    const workflow = saveApprovalWorkflow(createWorkflow({
      tenantId,
      targetType: targetType as any,
      targetId,
      workflowName: input.workflowName ?? (recommendation ? `${String((recommendation as any).actionType)} approval` : `${targetType} approval`),
      riskClass: input.riskClass ?? String((recommendation as any)?.actionRiskClass ?? "B"),
      delegatedApprovalAllowed: true,
      separationOfDutiesRequired: true,
    }));
    const actorId = input.actorId ?? "operator";
    const actorRole = input.actorRole ?? "OPERATOR";
    const currentStage = currentStageName(workflow);
    const evidence = Array.isArray((recommendation as any)?.evidencePointers) ? (recommendation as any).evidencePointers : [];
    if (targetType === "RECOMMENDATION") {
      const linked = await this.recommendationRepo.linkApprovalWorkflow(tenantId, targetId, { approvalWorkflowId: workflow.workflowId, approvalSubmittedAt: workflow.createdAt, approvalState: workflow.approvalState, currentApprovalStage: currentStage });
      if (!linked) throw new ApprovalAuthorityError("NOT_FOUND", "Recommendation not found", 404);
      await this.recommendationEvents.emit({ tenantId, recommendationId: targetId, eventType: "RECOMMENDATION_SUBMITTED_FOR_APPROVAL", actorId, actorRole, eventReason: input.reason ?? "Submitted to approval workflow", beforeState: String((recommendation as any)?.recommendationState ?? ""), afterState: String((linked as any).recommendationState), beforeReadiness: String((recommendation as any)?.executionReadiness ?? ""), afterReadiness: String((linked as any).executionReadiness), evidenceSnapshot: evidence, approvalSnapshot: { workflowId: workflow.workflowId, approvalState: workflow.approvalState, currentStage, sourceSystem: "APPROVAL_WORKFLOW" } });
      await platformEventService.recordApprovalEvent(tenantId, "APPROVAL_SUBMITTED", { eventId: `${targetId}:RECOMMENDATION_SUBMITTED_FOR_APPROVAL:${workflow.createdAt}`, entityType: "RECOMMENDATION", entityId: targetId, actorId, title: "Recommendation submitted for approval", description: input.reason ?? "Submitted to approval workflow", sourceSystem: "approval-authority-service", metadata: { actorRole, beforeState: String((recommendation as any)?.recommendationState ?? ""), afterState: String((linked as any).recommendationState), evidence }, occurredAt: workflow.createdAt });
    }
    await platformEventService.recordApprovalEvent(tenantId, "APPROVAL_SUBMITTED", { eventId: `${workflow.workflowId}:APPROVAL_SUBMITTED:${workflow.createdAt}`, entityType: "APPROVAL_WORKFLOW", entityId: workflow.workflowId, actorId, title: "Approval submitted", description: `Approval submitted for ${targetType}:${targetId}`, sourceSystem: "approval-authority-service", metadata: { actorRole, beforeState: "NOT_SUBMITTED", afterState: workflow.approvalState, evidence }, occurredAt: workflow.createdAt });
    for (const event of workflow.auditEvents) await platformEventService.recordNormalizedEvent(normalizeApprovalWorkflowEvent({ tenantId, workflowId: workflow.workflowId, ...event })).catch(() => undefined);
    return { approval: workflowToCanonicalApproval(workflow), workflow, existing: false };
  }

  async approve(tenantId: string, workflowId: string, actor: Actor = {}) {
    const actorId = actor.actorId ?? "operator";
    const actorRoles = actor.actorRoles ?? (actor.actorRole ? [actor.actorRole] : ["OWNER"]);
    const before = getApprovalWorkflow(tenantId, workflowId);
    const workflow = updateApprovalWorkflow(tenantId, workflowId, (current) => approveWorkflow(current, actorId, actorRoles));
    if (!workflow) throw new ApprovalAuthorityError("NOT_FOUND", "Approval workflow not found", 404);
    const last = workflow.auditEvents[workflow.auditEvents.length - 1];
    if (last && before?.updatedAt !== workflow.updatedAt) await platformEventService.recordNormalizedEvent(normalizeApprovalWorkflowEvent({ tenantId, workflowId, ...last, eventType: canonicalEventName(last.eventType, workflow.approvalState === "APPROVED") })).catch(() => undefined);
    if (workflow.targetType === "RECOMMENDATION") await this.recommendationRepo.linkApprovalWorkflow(tenantId, workflow.targetId, { approvalWorkflowId: workflow.workflowId, approvalSubmittedAt: workflow.createdAt, approvalState: workflow.approvalState, currentApprovalStage: currentStageName(workflow) });
    let executionRequest = null;
    if (before?.approvalState !== "APPROVED" && workflow.approvalState === "APPROVED") executionRequest = await this.executionRequests.createFromApprovedWorkflow(workflow, actorId, "APPROVAL_WORKFLOW");
    return { approval: workflowToCanonicalApproval(workflow), workflow, executionRequest };
  }

  async reject(tenantId: string, workflowId: string, actor: Actor = {}, reason = "REJECTED") {
    const actorId = actor.actorId ?? "operator";
    const workflow = updateApprovalWorkflow(tenantId, workflowId, (current) => rejectWorkflow(current, actorId, reason));
    if (!workflow) throw new ApprovalAuthorityError("NOT_FOUND", "Approval workflow not found", 404);
    const last = workflow.auditEvents[workflow.auditEvents.length - 1];
    if (last) await platformEventService.recordNormalizedEvent(normalizeApprovalWorkflowEvent({ tenantId, workflowId, ...last })).catch(() => undefined);
    if (workflow.targetType === "RECOMMENDATION") await this.recommendationRepo.linkApprovalWorkflow(tenantId, workflow.targetId, { approvalWorkflowId: workflow.workflowId, approvalSubmittedAt: workflow.createdAt, approvalState: workflow.approvalState, currentApprovalStage: currentStageName(workflow) });
    return { approval: workflowToCanonicalApproval(workflow), workflow };
  }

  expireStaleApprovals(tenantId: string, now = new Date()) {
    return listApprovalWorkflows(tenantId).filter((workflow) => workflow.approvalState === "EXPIRED" || new Date(workflow.approvalExpiryAt).getTime() < now.getTime()).map((workflow) => workflowToCanonicalApproval(workflow));
  }

  async listApprovals(tenantId: string, filters: { targetType?: ApprovalAuthorityTargetType } = {}) {
    const workflows = listApprovalWorkflows(tenantId).filter((workflow) => !filters.targetType || workflow.targetType === filters.targetType);
    const canonical = workflows.map(workflowToCanonicalApproval);
    return canonical;
  }

  private async getCanonicalApproval(tenantId: string, targetType: ApprovalAuthorityTargetType, targetId: string) {
    const workflow = listApprovalWorkflows(tenantId).find((row) => row.targetType === targetType && row.targetId === targetId);
    if (workflow) return workflowToCanonicalApproval(workflow);
    if (targetType !== "RECOMMENDATION") return null;
    try {
      const [legacy] = await db.select().from(approvalRequestsTable).where(and(eq(approvalRequestsTable.tenantId, tenantId), eq(approvalRequestsTable.recommendationId, targetId))).orderBy(desc(approvalRequestsTable.createdAt)).limit(1);
      if (!legacy) return null;
      return { approvalId: `legacy-${legacy.id}`, tenantId, targetType, targetId, workflowId: `legacy-${legacy.id}`, approvalState: canonicalState(legacy.status === "PENDING" ? "PENDING_APPROVAL" : legacy.status), requiredRoles: [legacy.requiredApproverRole], approvers: [], submittedAt: legacy.createdAt.toISOString(), expiresAt: legacy.expiresAt.toISOString(), sourceSystem: "LEGACY_APPROVAL_REQUEST", createdAt: legacy.createdAt.toISOString(), updatedAt: legacy.updatedAt.toISOString() } satisfies CanonicalApproval;
    } catch {
      return null;
    }
  }

  private async validateRecommendationSubmission(tenantId: string, recommendationId: string) {
    const recommendation = await this.recommendationRepo.getByRecommendationId(tenantId, recommendationId);
    if (!recommendation) throw new ApprovalAuthorityError("NOT_FOUND", "Recommendation not found", 404);
    if (String((recommendation as any).tenantId) !== tenantId) throw new ApprovalAuthorityError("NOT_FOUND", "Recommendation not found", 404);
    if (["BLOCKED", "NEVER_ELIGIBLE"].includes(String((recommendation as any).recommendationState)) || ["BLOCKED", "NEVER_ELIGIBLE"].includes(String((recommendation as any).executionReadiness))) throw new ApprovalAuthorityError("INVALID_RECOMMENDATION_STATE", "Blocked recommendations cannot be submitted for approval", 422);
    const readiness = String((recommendation as any).executionReadiness);
    if (!["APPROVAL_REQUIRED", "MANUAL_ONLY_APPROVAL_ALLOWED"].includes(readiness)) throw new ApprovalAuthorityError("INVALID_RECOMMENDATION_STATE", "Recommendation is not awaiting approval", 422);
    if (!Array.isArray((recommendation as any).evidencePointers) || (recommendation as any).evidencePointers.length === 0) throw new ApprovalAuthorityError("MISSING_EVIDENCE", "Recommendation requires evidence before approval submission", 422);
    if ((!Array.isArray((recommendation as any).requiredApprovals) || (recommendation as any).requiredApprovals.length === 0) && !(recommendation as any).actionRiskClass) throw new ApprovalAuthorityError("MISSING_APPROVAL_POLICY", "Recommendation requires approval policy metadata", 422);
    if ((recommendation as any).approvalWorkflowId && !inactiveWorkflowStates.has(String((recommendation as any).approvalState))) throw new ApprovalAuthorityError("APPROVAL_WORKFLOW_ALREADY_ACTIVE", "Recommendation already has an active approval workflow", 409);
  }

  getWorkflow(tenantId: string, workflowId: string) { return getApprovalWorkflow(tenantId, workflowId); }
}
