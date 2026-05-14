export type PlanStatus =
  | "DRAFT"
  | "QUEUED"
  | "WAITING_APPROVAL"
  | "WAITING_DEPENDENCIES"
  | "READY"
  | "RUNNING"
  | "PAUSED"
  | "ESCALATED"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "BLOCKED"
  | "QUARANTINED";

export type QueueItemStatus =
  | "PENDING"
  | "WAITING_APPROVAL"
  | "WAITING_DEPENDENCIES"
  | "READY"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "RETRY_SCHEDULED"
  | "PAUSED"
  | "ESCALATED"
  | "BLOCKED"
  | "QUARANTINED"
  | "CANCELLED";

export type RiskClass = "A" | "B" | "C";
export type RuntimeControlStatus = "ALLOW" | "WARN" | "BLOCK" | "QUARANTINE";
export type BlastRadiusBand = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExecutionPlan { id: string; tenantId: string; status: PlanStatus; workflowId?: string; correlationId: string; }
export interface QueueItem { id: string; tenantId: string; planId: string; recommendationId: string; status: QueueItemStatus; attemptCount: number; maxAttempts: number; lockedAt?: number; lockedBy?: string; runtimeControlStatus: RuntimeControlStatus; riskClass: RiskClass; workflowStepId?: string; }
