import type { Action, PermissionDomain, UserContext } from './rbac-types';
import { isAllowed } from './permission-resolver';
import { enforceTenantBoundary } from './tenant-boundary-engine';

export function authorize(ctx: UserContext, input:{tenantId:string; domain:PermissionDomain; action:Action}) {
  if (!enforceTenantBoundary(ctx, input.tenantId)) return { ok:false, reason:'TENANT_SCOPED' };
  if (!isAllowed(ctx.role, input.domain, input.action)) return { ok:false, reason:'RESTRICTED_BY_GOVERNANCE_POLICY' };
  return { ok:true };
}
