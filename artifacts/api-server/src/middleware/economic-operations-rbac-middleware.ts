import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { buildAuthContextSync, type AuthRole } from '../lib/auth/auth-context.js';
import { globalRbac, type Permission, type OperatorRole } from '../lib/economic-operations-rbac';
import type { ExecutionIntentType } from '../lib/economic-operations-intent-service';

// Bridge from existing AuthRole to economic-operations OperatorRole.
// Role is derived exclusively from JWT claims — no header overrides.
const AUTH_ROLE_TO_OPERATOR_ROLE: Record<AuthRole, OperatorRole> = {
  PLATFORM_ADMIN: 'OWNER',
  TENANT_ADMIN: 'ADMIN',
  APPROVER: 'APPROVER',
  OPERATOR: 'ECONOMIC_OPERATOR',
  VIEWER: 'VIEWER',
};

const INTENT_PERMISSION_MAP: Record<ExecutionIntentType, Permission> = {
  SIMULATE: 'SIMULATION_RUN',
  REQUEST_APPROVAL: 'APPROVAL_REQUEST',
  APPROVE: 'APPROVAL_GRANT',
  REJECT: 'APPROVAL_GRANT',
  REQUEST_MORE_EVIDENCE: 'APPROVAL_REQUEST',
  MARK_MANUAL_ONLY: 'EXECUTION_REQUEST',
  EXECUTE: 'EXECUTION_RUN',
  VERIFY: 'VERIFICATION_RUN',
  ROLLBACK: 'ROLLBACK_REQUEST',
  ACKNOWLEDGE_DRIFT: 'DRIFT_ACKNOWLEDGE',
  BLOCK: 'TENANT_CONFIGURE',
};

export function extractOperatorActor(req: Request): { actorId: string; actorRole: OperatorRole; tenantId: string } {
  const auth = buildAuthContextSync(req);
  // Role is derived from JWT claims only — x-actor-role header override has been removed
  const operatorRole: OperatorRole = AUTH_ROLE_TO_OPERATOR_ROLE[auth.role] ?? 'VIEWER';
  return { actorId: auth.userId, actorRole: operatorRole, tenantId: auth.tenantId };
}

export function requireOperatorPermission(permission: Permission): RequestHandler {
  return (req, res, next) => {
    const actor = extractOperatorActor(req);
    const result = globalRbac.check({ tenantId: actor.tenantId, actorId: actor.actorId, role: actor.actorRole, permission });
    if (!result.allowed) {
      res.status(403).json({ error: 'PERMISSION_DENIED', permission, actorRole: actor.actorRole, reason: result.reason });
      return;
    }
    next();
  };
}

export const intentPermissionGuard: RequestHandler = (req, res, next) => {
  const actor = extractOperatorActor(req);
  const body = typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const intentType = body['intentType'] as ExecutionIntentType | undefined;
  if (!intentType) {
    res.status(400).json({ error: 'MISSING_INTENT_TYPE' });
    return;
  }
  const permission = INTENT_PERMISSION_MAP[intentType];
  if (permission === undefined) {
    res.status(400).json({ error: 'UNKNOWN_INTENT_TYPE', intentType });
    return;
  }
  const result = globalRbac.check({
    tenantId: actor.tenantId,
    actorId: actor.actorId,
    role: actor.actorRole,
    permission,
    resourceType: 'execution',
    resourceId: typeof body['executionId'] === 'string' ? body['executionId'] : undefined,
  });
  if (!result.allowed) {
    res.status(403).json({ error: 'PERMISSION_DENIED', intentType, permission, actorRole: actor.actorRole, reason: result.reason });
    return;
  }
  next();
}
