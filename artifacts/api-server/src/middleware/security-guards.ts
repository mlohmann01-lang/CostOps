import type { NextFunction, Request, Response } from "express";
import { buildAuthContext } from "../lib/auth/auth-context";
import { authorizationService, type Capability } from "../lib/security/authorization-service";

function requestedTenant(req: Request): string | null {
  const tenantId = req.query.tenantId ?? req.header("x-tenant-id");
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) return null;
  return tenantId;
}

export function requireTenantContext() {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = buildAuthContext(req);
    const tenantId = requestedTenant(req);
    if (!tenantId) { res.status(400).json({ error: "TENANT_CONTEXT_REQUIRED" }); return; }
    if (auth.role !== "PLATFORM_ADMIN" && auth.tenantId !== tenantId) { res.status(403).json({ error: "TENANT_ACCESS_DENIED" }); return; }
    (req as any).tenantId = tenantId;
    next();
    return;
  };
}

export function requireCapability(capability: Capability) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = buildAuthContext(req);
    if (!authorizationService.hasCapability(auth.role, capability)) { res.status(403).json({ error: "CAPABILITY_FORBIDDEN", capability }); return; }
    next();
    return;
  };
}

export function requireTenantResourceAccess(_resourceType: string, resourceTenantIdResolver: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = buildAuthContext(req);
    const tenantId = resourceTenantIdResolver(req);
    if (auth.role !== "PLATFORM_ADMIN" && auth.tenantId !== tenantId) { res.status(403).json({ error: "RESOURCE_TENANT_ACCESS_DENIED" }); return; }
    next();
    return;
  };
}
