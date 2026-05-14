import type { AuthContext } from "../auth/auth-context";
export function assertTenantBoundary(ctx: AuthContext, tenantId: string) { if (ctx.role === "PLATFORM_ADMIN" && ctx.platformAdminOverride) return; if (ctx.tenantId !== tenantId) throw new Error("TENANT_BOUNDARY_VIOLATION"); }
export function validateTenantScopedQuery(tenantId?: string) { if (!tenantId) throw new Error("TENANT_ID_REQUIRED"); return tenantId; }
export function sanitizeTenantResponse<T extends Record<string, any>>(rows: T[], tenantId: string) { return rows.filter((r) => !r.tenantId || r.tenantId === tenantId); }
