import type { UserContext } from './rbac-types';

export function enforceTenantBoundary(ctx: UserContext, targetTenantId: string) {
  if (ctx.role === 'PLATFORM_ADMIN') return true;
  return String(ctx.tenantId) === String(targetTenantId);
}

export function enforceEnvironmentIsolation(ctx: UserContext, targetEnvironment: UserContext['environment']) {
  return ctx.environment === targetEnvironment;
}
