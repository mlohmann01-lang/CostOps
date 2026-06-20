import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { extractOperatorActor, requireOperatorPermission, intentPermissionGuard } from '../middleware/economic-operations-rbac-middleware';

function mockReq(opts: { role?: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'APPROVER' | 'OPERATOR' | 'VIEWER'; userId?: string; tenantId?: string; headers?: Record<string, string>; query?: Record<string, string>; body?: Record<string, unknown> } = {}): Request {
  const headers = opts.headers ?? {};
  return {
    headers,
    query: opts.query ?? {},
    body: opts.body ?? {},
    header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
    __authContext: {
      userId: opts.userId ?? 'user-1',
      tenantId: opts.tenantId ?? 'T1',
      role: opts.role ?? 'VIEWER',
      platformAdminOverride: opts.role === 'PLATFORM_ADMIN',
      authenticated: true,
    },
  } as unknown as Request;
}

type MockRes = { statusCode: number; body: unknown; status(c: number): MockRes; json(d: unknown): MockRes };
function mockRes(): MockRes {
  const r: MockRes = { statusCode: 200, body: null, status(c) { r.statusCode = c; return r; }, json(d) { r.body = d; return r; } };
  return r;
}

// --- extractOperatorActor ---

test('extractOperatorActor: ignores x-actor-role header and uses authenticated role', () => {
  const req = mockReq({ role: 'OPERATOR', userId: 'u1', tenantId: 'T1', headers: { 'x-actor-role': 'APPROVER' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ECONOMIC_OPERATOR');
  assert.equal(actor.tenantId, 'T1');
});

test('extractOperatorActor: maps PLATFORM_ADMIN AuthRole to OWNER OperatorRole', () => {
  const req = mockReq({ role: 'PLATFORM_ADMIN', userId: 'admin-1', tenantId: 'T1' });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'OWNER');
});

test('extractOperatorActor: maps OPERATOR AuthRole to ECONOMIC_OPERATOR', () => {
  const req = mockReq({ role: 'OPERATOR', userId: 'op-1', tenantId: 'T1' });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ECONOMIC_OPERATOR');
});

test('extractOperatorActor: invalid x-actor-role is ignored in favor of authenticated role', () => {
  const req = mockReq({ role: 'TENANT_ADMIN', userId: 'u1', tenantId: 'T1', headers: { 'x-actor-role': 'SUPERUSER' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ADMIN');
});

test('extractOperatorActor: tenantId comes from authenticated context, not query', () => {
  const req = mockReq({ role: 'VIEWER', tenantId: 'T2', query: { tenantId: 'QUERY-TENANT' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.tenantId, 'T2');
});

// --- requireOperatorPermission ---

test('requireOperatorPermission: OWNER passes EXECUTION_RUN', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'PLATFORM_ADMIN', userId: 'owner-1', tenantId: 'T1' });
  const res = mockRes();
  requireOperatorPermission('EXECUTION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('requireOperatorPermission: VIEWER denied EXECUTION_RUN returns 403', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'VIEWER', userId: 'viewer-1', tenantId: 'T1' });
  const res = mockRes();
  requireOperatorPermission('EXECUTION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal((res.body as any).error, 'PERMISSION_DENIED');
  assert.equal((res.body as any).permission, 'EXECUTION_RUN');
});

test('requireOperatorPermission: OPERATOR passes SIMULATION_RUN despite ignored AUDITOR header', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'OPERATOR', userId: 'aud-1', tenantId: 'T1', headers: { 'x-actor-role': 'AUDITOR' } });
  const res = mockRes();
  requireOperatorPermission('SIMULATION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('requireOperatorPermission: ADMIN passes CONNECTOR_CONFIGURE', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'TENANT_ADMIN', userId: 'conn-1', tenantId: 'T1' });
  const res = mockRes();
  requireOperatorPermission('CONNECTOR_CONFIGURE')(req, res as unknown as Response, next);
  assert.equal(called, true);
});

// --- intentPermissionGuard ---

test('intentPermissionGuard: SIMULATE maps to SIMULATION_RUN, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'OPERATOR', userId: 'op-1', tenantId: 'T1', body: { intentType: 'SIMULATE', executionId: 'exec-1', tenantId: 'T1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: EXECUTE maps to EXECUTION_RUN, ECONOMIC_OPERATOR denied', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'OPERATOR', userId: 'op-1', tenantId: 'T1', body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
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
  const req = mockReq({ role: 'APPROVER', userId: 'app-1', tenantId: 'T1', body: { intentType: 'APPROVE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: EXECUTE passes for OWNER', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'PLATFORM_ADMIN', userId: 'owner-1', tenantId: 'T1', body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: ROLLBACK maps to ROLLBACK_REQUEST, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'OPERATOR', userId: 'op-1', tenantId: 'T1', body: { intentType: 'ROLLBACK', executionId: 'exec-1' } });
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

test('intentPermissionGuard: ADMIN passes EXECUTION_RUN despite ignored CONNECTOR_ADMIN header', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'TENANT_ADMIN', userId: 'conn-1', tenantId: 'T1', headers: { 'x-actor-role': 'CONNECTOR_ADMIN' }, body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('intentPermissionGuard: VIEWER denied SIMULATE', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'VIEWER', userId: 'view-1', tenantId: 'T1', body: { intentType: 'SIMULATE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('intentPermissionGuard: ACKNOWLEDGE_DRIFT maps to DRIFT_ACKNOWLEDGE, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ role: 'OPERATOR', userId: 'op-1', tenantId: 'T1', body: { intentType: 'ACKNOWLEDGE_DRIFT', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});
