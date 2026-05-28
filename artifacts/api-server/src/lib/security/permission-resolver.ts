import type { Action, PermissionDomain, Role } from './rbac-types';

const deny = (): Record<PermissionDomain, Action[]> => ({ recommendations:[], campaigns:[], schedules:[], approvals:[], execution_requests:[], dry_runs:[], executions:[], outcomes:[], audit_exports:[], observability:[], connector_management:[] });
const allowAll: Record<PermissionDomain, Action[]> = { recommendations:['read','write','approve','export'], campaigns:['read','write','approve','export'], schedules:['read','write','approve','export'], approvals:['read','write','approve'], execution_requests:['read','write','execute'], dry_runs:['read','write'], executions:['read','execute'], outcomes:['read','write','export'], audit_exports:['read','export','write'], observability:['read'], connector_management:['read','write'] };

const policy: Record<Role, Record<PermissionDomain, Action[]>> = {
  PLATFORM_ADMIN: allowAll,
  TENANT_ADMIN: allowAll,
  GOVERNANCE_OPERATOR: { ...deny(), recommendations:['read','write'], campaigns:['read','write'], schedules:['read','write'], approvals:['read'], audit_exports:['read','export'], observability:['read'], outcomes:['read'] },
  APPROVER: { ...deny(), recommendations:['read'], campaigns:['read'], schedules:['read'], approvals:['read','approve'], audit_exports:['read','export'], observability:['read'] },
  AUDITOR: { ...deny(), recommendations:['read'], campaigns:['read'], schedules:['read'], approvals:['read'], outcomes:['read'], audit_exports:['read','export'], observability:['read'] },
  EXECUTION_OPERATOR: { ...deny(), recommendations:['read'], execution_requests:['read','write','execute'], dry_runs:['read','write'], executions:['read','execute'], outcomes:['read'], observability:['read'] },
  READ_ONLY_OBSERVER: { ...deny(), recommendations:['read'], campaigns:['read'], schedules:['read'], approvals:['read'], execution_requests:['read'], dry_runs:['read'], executions:['read'], outcomes:['read'], audit_exports:['read'], observability:['read'] },
};

export function isAllowed(role: Role, domain: PermissionDomain, action: Action) { return policy[role][domain].includes(action); }
export function resolvePermissions(role: Role) { return policy[role]; }
