export type Role = 'PLATFORM_ADMIN'|'TENANT_ADMIN'|'GOVERNANCE_OPERATOR'|'APPROVER'|'AUDITOR'|'EXECUTION_OPERATOR'|'READ_ONLY_OBSERVER';
export type PermissionDomain = 'recommendations'|'campaigns'|'schedules'|'approvals'|'execution_requests'|'dry_runs'|'executions'|'outcomes'|'audit_exports'|'observability'|'connector_management';
export type Action = 'read'|'write'|'approve'|'execute'|'export';
export interface UserContext { userId:string; tenantId:string; role:Role; environment:'DEV'|'STAGING'|'PROD'; capabilities?:string[]; }
export interface Permission { domain:PermissionDomain; action:Action; allowed:boolean; }
