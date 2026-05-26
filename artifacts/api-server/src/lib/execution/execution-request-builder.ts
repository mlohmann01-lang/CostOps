import { validateExecutionRequestPreconditions } from "./execution-readiness-validator";
import type { BuildExecutionRequestInput, ExecutionMode, ExecutionRequestObject } from "./types";

function uuidLike(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function pickMode(input: BuildExecutionRequestInput): ExecutionMode {
  if (input.recommendation.actionRiskClass === "A") return "AUTO_EXECUTE_SAFE";
  return "APPROVAL_REQUIRED";
}

export function buildExecutionRequest(input: BuildExecutionRequestInput): ExecutionRequestObject {
  const now = new Date();
  const blockedReasons = validateExecutionRequestPreconditions(input);
  const isHighRisk = input.recommendation.actionRiskClass !== "A";

  return {
    executionRequestId: input.existingRequest?.executionRequestId ?? uuidLike("execreq"),
    tenantId: input.tenantId,
    recommendationId: input.recommendationId,
    playbookId: input.recommendation.playbookId,
    targetEntityId: input.recommendation.targetEntityId,
    actionType: input.recommendation.actionType,
    actionRiskClass: input.recommendation.actionRiskClass,
    requestedBy: input.requestedBy,
    requestedAt: input.existingRequest?.requestedAt ?? now.toISOString(),
    approvedBy: null,
    approvedAt: null,
    executionState: blockedReasons.length ? "BLOCKED" : "REQUESTED",
    executionMode: blockedReasons.length ? "MANUAL_EXECUTION" : pickMode(input),
    dryRunRequired: isHighRisk,
    rollbackRequired: isHighRisk && (input.rollbackSupported ?? true),
    rollbackPlan: isHighRisk ? { strategy: "reassign-license", required: true } : { required: false },
    preflightChecks: ["EVIDENCE_PRESENT", "APPROVAL_EVENT_PRESENT", "READINESS_CONFIRMED"],
    blockedReasons,
    evidencePointers: input.recommendation.evidencePointers,
    governanceEventIds: input.approvalEventIds,
    idempotencyKey: input.idempotencyKey,
    expiresAt: input.expiresAt ?? new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
  };
}
