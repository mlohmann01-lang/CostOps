export type TrustResolutionTaskStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";
export type TrustResolutionTaskPriority = "HIGH" | "MEDIUM" | "LOW";
export type TrustResolutionTaskOwnerType = "USER" | "TEAM" | "SYSTEM";
export type TrustResolutionTaskSlaStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE";
export type TrustResolutionTaskEscalationLevel = "NONE" | "MANAGER" | "DIRECTOR" | "EXECUTIVE";
export type TrustResolutionTaskAccountabilityStatus = "UNASSIGNED" | "ASSIGNED" | "AT_RISK" | "OVERDUE" | "ESCALATED" | "RESOLVED";

export type TrustTaskOwner = {
  ownerId?: string;
  ownerName?: string;
  ownerType?: TrustResolutionTaskOwnerType;
};

export type TrustResolutionTask = {
  taskId: string;
  tenantId: string;
  findingId: string;
  affectedRecommendationIds: string[];
  taskType: string;
  title: string;
  description: string;
  owner: string;
  ownerId?: string;
  ownerName?: string;
  ownerType?: TrustResolutionTaskOwnerType;
  assignedAt?: string;
  status: TrustResolutionTaskStatus;
  priority: TrustResolutionTaskPriority;
  unlockValue: number;
  resolutionHint: string;
  slaHours: number;
  dueAt: string;
  slaStatus: TrustResolutionTaskSlaStatus;
  escalationLevel: TrustResolutionTaskEscalationLevel;
  escalatedAt?: string;
  escalationReason?: string;
  accountabilityStatus: TrustResolutionTaskAccountabilityStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type TrustResolutionTaskEventType =
  | "TRUST_RESOLUTION_TASK_CREATED"
  | "TRUST_RESOLUTION_TASK_STATUS_CHANGED"
  | "TRUST_FINDING_RESOLVED"
  | "TRUST_TASK_ASSIGNED"
  | "TRUST_TASK_ESCALATED"
  | "TRUST_TASK_OVERDUE"
  | "TRUST_TASK_AT_RISK"
  | "TRUST_ACCOUNTABILITY_ROLLUP_UPDATED";

export type TrustResolutionTaskEvent = {
  eventType: TrustResolutionTaskEventType;
  tenantId: string;
  taskId: string;
  findingId: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type CreateTrustResolutionTaskInput = {
  tenantId: string;
  findingId: string;
  affectedRecommendationIds: string[];
  taskType: string;
  title: string;
  description: string;
  owner?: string;
  ownerId?: string;
  ownerName?: string;
  ownerType?: TrustResolutionTaskOwnerType;
  assignedAt?: string;
  priority: TrustResolutionTaskPriority;
  unlockValue: number;
  resolutionHint: string;
  slaHours: number;
  dueAt: string;
  slaStatus: TrustResolutionTaskSlaStatus;
  escalationLevel: TrustResolutionTaskEscalationLevel;
  accountabilityStatus: TrustResolutionTaskAccountabilityStatus;
  createdAt?: string;
};

export type TrustAccountabilityRollup = {
  openTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  atRiskTasks: number;
  escalatedTasks: number;
  resolvedThisMonth: number;
  blockedValueOpen: number;
  blockedValueOverdue: number;
  highestEscalationLevel: TrustResolutionTaskEscalationLevel;
  generatedAt: string;
};
