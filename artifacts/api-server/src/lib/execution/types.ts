import type { ActionRiskClass, ExecutionReadiness } from "../recommendations/types";

export const EXECUTION_REQUEST_STATES = ["DRAFT","REQUESTED","APPROVED_FOR_EXECUTION","BLOCKED","CANCELLED","EXPIRED","EXECUTED","FAILED","ROLLED_BACK"] as const;
export type ExecutionRequestState = (typeof EXECUTION_REQUEST_STATES)[number];

export const EXECUTION_MODES = ["DRY_RUN_ONLY","APPROVAL_REQUIRED","MANUAL_EXECUTION","AUTO_EXECUTE_SAFE"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export type ExecutionRequestObject = {
  executionRequestId: string;
  tenantId: string;
  recommendationId: string;
  playbookId: string;
  targetEntityId: string;
  actionType: string;
  actionRiskClass: ActionRiskClass;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  executionState: ExecutionRequestState;
  executionMode: ExecutionMode;
  dryRunRequired: boolean;
  rollbackRequired: boolean;
  rollbackPlan: Record<string, unknown>;
  preflightChecks: string[];
  blockedReasons: string[];
  evidencePointers: string[];
  governanceEventIds: string[];
  idempotencyKey: string;
  expiresAt: string;
};

export type BuildExecutionRequestInput = {
  tenantId: string;
  recommendationId: string;
  requestedBy: string;
  idempotencyKey: string;
  expiresAt?: string;
  approvalEventIds: string[];
  rollbackSupported?: boolean;
  existingRequest?: ExecutionRequestObject | null;
  recommendation: {
    recommendationState: string;
    executionReadiness: ExecutionReadiness;
    playbookId: string;
    targetEntityId: string;
    actionType: string;
    actionRiskClass: ActionRiskClass;
    evidencePointers: string[];
  };
};


export interface ExecutionRequestV1 {
  requestId: string;
  tenantId: string;
  recommendationId: string;
  approvalWorkflowId: string;
  actionType: string;
  playbookId: string;
  platform: string;
  riskClass: "A" | "B" | "C" | "D";
  readinessState: "PENDING_DRY_RUN" | "READY_FOR_DRY_RUN" | "DRY_RUN_BLOCKED" | "READY_FOR_EXECUTION" | "EXECUTION_BLOCKED" | "REQUIRES_REVIEW";
  executionMode: "MANUAL" | "SUPERVISED" | "AUTO";
  rollbackCoverage: "FULL" | "PARTIAL" | "NONE";
  projectedMonthlySavings?: number;
  projectedAnnualSavings?: number;
  createdAt: string;
  createdByWorkflowId: string;
  governanceStatus: "VALID" | "STALE" | "BLOCKED";
  policyEvaluationId?: string;
  latestDryRunState?: string;
  latestDryRunId?: string;
  rollbackSupported?: boolean;
  policyBlocksSummary?: string;
  latestExecutionResultId?: string;
  latestExecutionResultState?: string;
  latestOutcomeId?: string;
  latestOutcomeState?: string;
  verifiedMonthlySavings?: number;
  savingsVariance?: number;
  metadata?: Record<string, unknown>;
}
