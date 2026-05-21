export type OperatorRole =
  | 'OWNER'
  | 'ADMIN'
  | 'ECONOMIC_OPERATOR'
  | 'APPROVER'
  | 'AUDITOR'
  | 'VIEWER'
  | 'CONNECTOR_ADMIN';

export type Permission =
  | 'TENANT_READ'
  | 'TENANT_CONFIGURE'
  | 'CONNECTOR_CONFIGURE'
  | 'RECOMMENDATION_READ'
  | 'SIMULATION_RUN'
  | 'APPROVAL_REQUEST'
  | 'APPROVAL_GRANT'
  | 'EXECUTION_REQUEST'
  | 'EXECUTION_APPROVE'
  | 'EXECUTION_RUN'
  | 'ROLLBACK_REQUEST'
  | 'ROLLBACK_APPROVE'
  | 'ROLLBACK_RUN'
  | 'VERIFICATION_RUN'
  | 'DRIFT_ACKNOWLEDGE'
  | 'AUDIT_READ';

export type RbacCheckResult = {
  allowed: boolean;
  reason: string;
  role: OperatorRole;
  permission: Permission;
  tenantId: string;
  actorId: string;
};

export type RbacAuditEntry = {
  tenantId: string;
  actorId: string;
  role: OperatorRole;
  permission: Permission;
  allowed: boolean;
  reason: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: string;
};

const ROLE_PERMISSIONS: Record<OperatorRole, Permission[]> = {
  OWNER: [
    'TENANT_READ', 'TENANT_CONFIGURE', 'CONNECTOR_CONFIGURE',
    'RECOMMENDATION_READ', 'SIMULATION_RUN', 'APPROVAL_REQUEST',
    'APPROVAL_GRANT', 'EXECUTION_REQUEST', 'EXECUTION_APPROVE',
    'EXECUTION_RUN', 'ROLLBACK_REQUEST', 'ROLLBACK_APPROVE',
    'ROLLBACK_RUN', 'VERIFICATION_RUN', 'DRIFT_ACKNOWLEDGE', 'AUDIT_READ',
  ],
  ADMIN: [
    'TENANT_READ', 'TENANT_CONFIGURE', 'CONNECTOR_CONFIGURE',
    'RECOMMENDATION_READ', 'SIMULATION_RUN', 'APPROVAL_REQUEST',
    'APPROVAL_GRANT', 'EXECUTION_REQUEST', 'EXECUTION_APPROVE',
    'EXECUTION_RUN', 'ROLLBACK_REQUEST', 'ROLLBACK_APPROVE',
    'ROLLBACK_RUN', 'VERIFICATION_RUN', 'DRIFT_ACKNOWLEDGE', 'AUDIT_READ',
  ],
  ECONOMIC_OPERATOR: [
    'TENANT_READ', 'RECOMMENDATION_READ', 'SIMULATION_RUN',
    'APPROVAL_REQUEST', 'EXECUTION_REQUEST', 'ROLLBACK_REQUEST',
    'VERIFICATION_RUN', 'DRIFT_ACKNOWLEDGE',
  ],
  APPROVER: [
    'TENANT_READ', 'RECOMMENDATION_READ', 'SIMULATION_RUN',
    'APPROVAL_GRANT', 'EXECUTION_APPROVE', 'ROLLBACK_APPROVE',
  ],
  AUDITOR: [
    'TENANT_READ', 'RECOMMENDATION_READ', 'AUDIT_READ',
  ],
  VIEWER: [
    'TENANT_READ', 'RECOMMENDATION_READ',
  ],
  CONNECTOR_ADMIN: [
    'TENANT_READ', 'CONNECTOR_CONFIGURE', 'RECOMMENDATION_READ',
  ],
};

export class EconomicOperationsRbac {
  private auditLog: RbacAuditEntry[] = [];

  hasPermission(role: OperatorRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }

  check(params: {
    tenantId: string;
    actorId: string;
    role: OperatorRole;
    permission: Permission;
    resourceType?: string;
    resourceId?: string;
  }): RbacCheckResult {
    const allowed = this.hasPermission(params.role, params.permission);
    const reason = allowed
      ? `Role ${params.role} has permission ${params.permission}`
      : `Role ${params.role} lacks permission ${params.permission}`;

    const entry: RbacAuditEntry = {
      tenantId: params.tenantId,
      actorId: params.actorId,
      role: params.role,
      permission: params.permission,
      allowed,
      reason,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      timestamp: new Date().toISOString(),
    };
    this.auditLog.push(entry);

    return { allowed, reason, role: params.role, permission: params.permission, tenantId: params.tenantId, actorId: params.actorId };
  }

  requirePermission(params: {
    tenantId: string;
    actorId: string;
    role: OperatorRole;
    permission: Permission;
    resourceType?: string;
    resourceId?: string;
  }): void {
    const result = this.check(params);
    if (!result.allowed) {
      throw new Error(`RBAC_DENIED: ${result.reason} [actor=${params.actorId}, tenant=${params.tenantId}]`);
    }
  }

  canApproveOwnExecution(role: OperatorRole, isOwnExecution: boolean, isHighRisk: boolean): boolean {
    if (role === 'OWNER' || role === 'ADMIN') return true;
    if (isHighRisk && isOwnExecution) return false;
    return this.hasPermission(role, 'EXECUTION_APPROVE');
  }

  getPermissionsForRole(role: OperatorRole): Permission[] {
    return [...(ROLE_PERMISSIONS[role] ?? [])];
  }

  getDeniedAuditEntries(): RbacAuditEntry[] {
    return this.auditLog.filter((e) => !e.allowed);
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }
}

export const globalRbac = new EconomicOperationsRbac();

export function requireOperatorPermission(role: OperatorRole, permission: Permission): void {
  if (!ROLE_PERMISSIONS[role]?.includes(permission)) {
    throw new Error(`RBAC_DENIED: Role ${role} lacks ${permission}`);
  }
}
