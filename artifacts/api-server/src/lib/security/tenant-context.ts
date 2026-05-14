import type { AuthContext } from "../auth/auth-context";
export type TenantContext = { tenantId: string; canOverride: boolean };
export function buildTenantContext(auth: AuthContext): TenantContext { return { tenantId: auth.tenantId, canOverride: auth.role === "PLATFORM_ADMIN" && auth.platformAdminOverride }; }
export function tenantSafePagination(limit = 50, offset = 0) { return { limit: Math.min(Math.max(limit, 1), 500), offset: Math.max(offset, 0) }; }
export function tenantSafeLookup<T extends { tenantId?: string }>(rows: T[], ctx: TenantContext) { return rows.filter((r) => !r.tenantId || r.tenantId === ctx.tenantId || ctx.canOverride); }
