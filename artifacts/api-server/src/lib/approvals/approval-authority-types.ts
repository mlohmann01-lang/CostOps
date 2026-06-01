export type ApprovalAuthorityTargetType = "RECOMMENDATION" | "OPPORTUNITY" | "EXECUTION_REQUEST" | "SCHEDULE" | "CAMPAIGN";
export type CanonicalApprovalState = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELLED";
export type ApprovalAuthoritySourceSystem = "APPROVAL_WORKFLOW" | "LEGACY_APPROVAL_REQUEST";

export interface CanonicalApproval {
  approvalId: string;
  tenantId: string;
  targetType: ApprovalAuthorityTargetType;
  targetId: string;
  workflowId: string;
  approvalState: CanonicalApprovalState;
  currentStage?: string;
  requiredRoles: string[];
  approvers: Array<{ actorId: string; actorRole: string; approvedAt?: string; decision?: "APPROVED" | "REJECTED" }>;
  submittedAt?: string;
  decidedAt?: string;
  expiresAt?: string;
  sourceSystem: ApprovalAuthoritySourceSystem;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAuthorityStatus {
  targetType: ApprovalAuthorityTargetType;
  targetId: string;
  approvalState: CanonicalApprovalState;
  workflowId?: string;
  currentStage?: string;
  canApprove: boolean;
  canReject: boolean;
  canEscalate: boolean;
  blockingReasons: string[];
  sourceSystem?: ApprovalAuthoritySourceSystem;
}
