import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { type AuthRole } from '../lib/auth/auth-context.js';
import { globalRbac, type Permission, type OperatorRole } from '../lib/economic-operations-rbac';
import type { ExecutionIntentType } from '../lib/economic-operations-intent-service';

// Bridge from existing AuthRole to economic-operations OperatorRole.
const AUTH_ROLE_TO_OPERATOR_ROLE: Record<AuthRole, OperatorRole> = {
  PLATFORM_ADMIN: 'OWNER',
  TENANT_ADMIN: 'ADMIN',
  APPROVER: 'APPROVER',
  OPERATOR: 'ECONOMIC_OPERATOR',
  VIEWER: 'VIEWER',
};

const VALID_OPERATOR_ROLES: ReadonlySet<OperatorRole> = new Set<OperatorRole>([
  'OWNER',
  'ADMIN',
  'ECONOMIC_OPERATOR',
  'APPROVER',
  'AUDITOR',
  'VIEWER',
  'CONNECTOR_ADMIN',
]);

function readHeader(req: Request, name: string): string | undefined {
  const headers = req.headers as Record<string, string | string[] | undefined>;
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === 'string' ? raw : undefined;
}

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
  const actorId = readHeader(req, 'x-user-id') ?? 'anonymous';
  const authRole = readHeader(req, 'x-role') as AuthRole | undefined;
  const mappedRole: OperatorRole = (authRole && AUTH_ROLE_TO_OPERATOR_ROLE[authRole]) ?? 'VIEWER';

  // x-actor-role may override the mapped role, but only when it names a valid OperatorRole.
  const actorRoleHeader = readHeader(req, 'x-actor-role') as OperatorRole | undefined;
  const operatorRole: OperatorRole =
    actorRoleHeader && VALID_OPERATOR_ROLES.has(actorRoleHeader) ? actorRoleHeader : mappedRole;

  const tenantId =
    readHeader(req, 'x-tenant-id') ??
    (typeof (req.query as Record<string, unknown>)?.['tenantId'] === 'string'
      ? ((req.query as Record<string, string>)['tenantId'])
      : 'unknown');

  return { actorId, actorRole: operatorRole, tenantId };
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
