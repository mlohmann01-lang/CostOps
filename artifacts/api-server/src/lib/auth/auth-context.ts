import type { Request } from "express";
export type AuthRole = "PLATFORM_ADMIN"|"TENANT_ADMIN"|"APPROVER"|"OPERATOR"|"VIEWER";
export type AuthContext = { userId: string; tenantId: string; role: AuthRole; platformAdminOverride: boolean };
export function buildAuthContext(req: Request): AuthContext { return { userId: String(req.header("x-user-id") ?? "anonymous"), tenantId: String(req.header("x-tenant-id") ?? req.query.tenantId ?? "default"), role: (req.header("x-role") as AuthRole) ?? "VIEWER", platformAdminOverride: req.header("x-platform-override") === "true" }; }
export function requireAuth(req: Request) { const ctx = buildAuthContext(req); if (ctx.userId === "anonymous") throw new Error("AUTH_REQUIRED"); return ctx; }
