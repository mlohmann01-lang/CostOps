import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { extractOperatorActor, requireOperatorPermission, intentPermissionGuard } from '../middleware/economic-operations-rbac-middleware';
import type { AuthRole, AuthContext } from '../lib/auth/auth-context';

function mockReq(opts: { userId?: string; role?: AuthRole; tenantId?: string; authenticated?: boolean; body?: Record<string, unknown> } = {}): Request {
  const authContext: AuthContext = {
    userId: opts.userId ?? 'anonymous',
    tenantId: opts.tenantId ?? 'unknown',
    role: opts.role ?? 'VIEWER',
    platformAdminOverride: opts.role === 'PLATFORM_ADMIN',
    authenticated: opts.authenticated ?? true,
  };
  return {
    headers: {},
    query: {},
    body: opts.body ?? {},
    header: () => undefined,
    __authContext: authContext,
  } as unknown as Request;
}

type MockRes = { statusCode: number; body: unknown; status(c: number): MockRes; json(d: unknown): MockRes };
function mockRes(): MockRes {
  const r: MockRes = { statusCode: 200, body: null, status(c) { r.statusCode = c; return r; }, json(d) { r.body = d; return r; } };
  return r;
}

// --- extractOperatorActor ---

test('extractOperatorActor: maps PLATFORM_ADMIN AuthRole to OWNER OperatorRole', () => {
  const req = mockReq({ userId: 'admin-1', role: 'PLATFORM_ADMIN', tenantId: 'T1' });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'OWNER');
});

test('extractOperatorActor: maps OPERATOR AuthRole to ECONOMIC_OPERATOR', () => {
  const req = mockReq({ userId: 'op-1', role: 'OPERATOR', tenantId: 'T1' });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ECONOMIC_OPERATOR');
});

test('extractOperatorActor: maps TENANT_ADMIN AuthRole to ADMIN', () => {
  const req = mockReq({ userId: 'u1', role: 'TENANT_ADMIN', tenantId: 'T1' });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ADMIN');
});

test('extractOperatorActor: tenantId comes from authenticated context', () => {
  const req = mockReq({ role: 'VIEWER', tenantId: 'T2' });
  const actor = extractOperatorActor(req);
  assert.equal(actor.tenantId, 'T2');
});

test('extractOperatorActor: no prior authMiddleware falls back to unauthenticated VIEWER', () => {
  const req = { headers: {}, query: {}, body: {}, header: () => undefined } as unknown as Request;
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'VIEWER');
  assert.equal(actor.tenantId, 'unknown');
});

// --- requireOperatorPermission ---

test('requireOperatorPermission: OWNER passes EXECUTION_RUN', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'owner-1', role: 'PLATFORM_ADMIN', tenantId: 'T1' });
  const res = mockRes();
  requireOperatorPermission('EXECUTION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('requireOperatorPermission: VIEWER denied EXECUTION_RUN returns 403', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'viewer-1', role: 'VIEWER', tenantId: 'T1' });
  const res = mockRes();
  requireOperatorPermission('EXECUTION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal((res.body as any).error, 'PERMISSION_DENIED');
  assert.equal((res.body as any).permission, 'EXECUTION_RUN');
});

// --- intentPermissionGuard ---

test('intentPermissionGuard: SIMULATE maps to SIMULATION_RUN, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'op-1', role: 'OPERATOR', tenantId: 'T1', body: { intentType: 'SIMULATE', executionId: 'exec-1', tenantId: 'T1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: EXECUTE maps to EXECUTION_RUN, ECONOMIC_OPERATOR denied', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'op-1', role: 'OPERATOR', tenantId: 'T1', body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal((res.body as any).intentType, 'EXECUTE');
  assert.equal((res.body as any).permission, 'EXECUTION_RUN');
});

test('intentPermissionGuard: APPROVE maps to APPROVAL_GRANT, APPROVER passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'app-1', role: 'APPROVER', tenantId: 'T1', body: { intentType: 'APPROVE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: EXECUTE passes for OWNER', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'owner-1', role: 'PLATFORM_ADMIN', tenantId: 'T1', body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: ROLLBACK maps to ROLLBACK_REQUEST, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'op-1', role: 'OPERATOR', tenantId: 'T1', body: { intentType: 'ROLLBACK', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: missing intentType returns 400', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'PLATFORM_ADMIN', body: { executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.equal((res.body as any).error, 'MISSING_INTENT_TYPE');
});

test('intentPermissionGuard: VIEWER denied SIMULATE', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'view-1', role: 'VIEWER', tenantId: 'T1', body: { intentType: 'SIMULATE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('intentPermissionGuard: ACKNOWLEDGE_DRIFT maps to DRIFT_ACKNOWLEDGE, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ userId: 'op-1', role: 'OPERATOR', tenantId: 'T1', body: { intentType: 'ACKNOWLEDGE_DRIFT', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});
