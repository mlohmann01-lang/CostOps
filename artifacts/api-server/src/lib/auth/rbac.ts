import type { AuthContext, AuthRole } from "./auth-context";
const order: AuthRole[] = ["VIEWER","OPERATOR","APPROVER","TENANT_ADMIN","PLATFORM_ADMIN"];
export function requireTenantAccess(ctx: AuthContext, tenantId: string) { if (ctx.role === "PLATFORM_ADMIN" && ctx.platformAdminOverride) return; if (ctx.tenantId !== tenantId) throw new Error("TENANT_ACCESS_DENIED"); }
export function requireRole(ctx: AuthContext, min: AuthRole) { if (order.indexOf(ctx.role) < order.indexOf(min)) throw new Error("ROLE_FORBIDDEN"); }
