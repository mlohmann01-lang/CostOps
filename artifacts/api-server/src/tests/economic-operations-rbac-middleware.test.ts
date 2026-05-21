import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { extractOperatorActor, requireOperatorPermission, intentPermissionGuard } from '../middleware/economic-operations-rbac-middleware';

function mockReq(opts: { headers?: Record<string, string>; query?: Record<string, string>; body?: Record<string, unknown> } = {}): Request {
  const headers = opts.headers ?? {};
  return {
    headers,
    query: opts.query ?? {},
    body: opts.body ?? {},
    header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
  } as unknown as Request;
}

type MockRes = { statusCode: number; body: unknown; status(c: number): MockRes; json(d: unknown): MockRes };
function mockRes(): MockRes {
  const r: MockRes = { statusCode: 200, body: null, status(c) { r.statusCode = c; return r; }, json(d) { r.body = d; return r; } };
  return r;
}

// --- extractOperatorActor ---

test('extractOperatorActor: x-actor-role APPROVER overrides mapped role', () => {
  const req = mockReq({ headers: { 'x-user-id': 'u1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1', 'x-actor-role': 'APPROVER' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'APPROVER');
  assert.equal(actor.tenantId, 'T1');
});

test('extractOperatorActor: maps PLATFORM_ADMIN AuthRole to OWNER OperatorRole', () => {
  const req = mockReq({ headers: { 'x-user-id': 'admin-1', 'x-role': 'PLATFORM_ADMIN', 'x-tenant-id': 'T1' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'OWNER');
});

test('extractOperatorActor: maps OPERATOR AuthRole to ECONOMIC_OPERATOR', () => {
  const req = mockReq({ headers: { 'x-user-id': 'op-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ECONOMIC_OPERATOR');
});

test('extractOperatorActor: invalid x-actor-role falls back to AuthRole mapping', () => {
  const req = mockReq({ headers: { 'x-user-id': 'u1', 'x-role': 'TENANT_ADMIN', 'x-tenant-id': 'T1', 'x-actor-role': 'SUPERUSER' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.actorRole, 'ADMIN');
});

test('extractOperatorActor: tenantId from query if header absent', () => {
  const req = mockReq({ headers: { 'x-role': 'VIEWER' }, query: { tenantId: 'T2' } });
  const actor = extractOperatorActor(req);
  assert.equal(actor.tenantId, 'T2');
});

// --- requireOperatorPermission ---

test('requireOperatorPermission: OWNER passes EXECUTION_RUN', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'owner-1', 'x-role': 'PLATFORM_ADMIN', 'x-tenant-id': 'T1' } });
  const res = mockRes();
  requireOperatorPermission('EXECUTION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});

test('requireOperatorPermission: VIEWER denied EXECUTION_RUN returns 403', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'viewer-1', 'x-role': 'VIEWER', 'x-tenant-id': 'T1' } });
  const res = mockRes();
  requireOperatorPermission('EXECUTION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
  assert.equal((res.body as any).error, 'PERMISSION_DENIED');
  assert.equal((res.body as any).permission, 'EXECUTION_RUN');
});

test('requireOperatorPermission: AUDITOR (via x-actor-role) denied SIMULATION_RUN returns 403', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'aud-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1', 'x-actor-role': 'AUDITOR' } });
  const res = mockRes();
  requireOperatorPermission('SIMULATION_RUN')(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('requireOperatorPermission: CONNECTOR_ADMIN passes CONNECTOR_CONFIGURE', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'conn-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1', 'x-actor-role': 'CONNECTOR_ADMIN' } });
  const res = mockRes();
  requireOperatorPermission('CONNECTOR_CONFIGURE')(req, res as unknown as Response, next);
  assert.equal(called, true);
});

// --- intentPermissionGuard ---

test('intentPermissionGuard: SIMULATE maps to SIMULATION_RUN, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'op-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1' }, body: { intentType: 'SIMULATE', executionId: 'exec-1', tenantId: 'T1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: EXECUTE maps to EXECUTION_RUN, ECONOMIC_OPERATOR denied', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'op-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1' }, body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
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
  const req = mockReq({ headers: { 'x-user-id': 'app-1', 'x-role': 'APPROVER', 'x-tenant-id': 'T1' }, body: { intentType: 'APPROVE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: EXECUTE passes for OWNER', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'owner-1', 'x-role': 'PLATFORM_ADMIN', 'x-tenant-id': 'T1' }, body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: ROLLBACK maps to ROLLBACK_REQUEST, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'op-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1' }, body: { intentType: 'ROLLBACK', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});

test('intentPermissionGuard: missing intentType returns 400', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-role': 'PLATFORM_ADMIN' }, body: { executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 400);
  assert.equal((res.body as any).error, 'MISSING_INTENT_TYPE');
});

test('intentPermissionGuard: CONNECTOR_ADMIN denied EXECUTION_RUN', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'conn-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1', 'x-actor-role': 'CONNECTOR_ADMIN' }, body: { intentType: 'EXECUTE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('intentPermissionGuard: VIEWER denied SIMULATE', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'view-1', 'x-role': 'VIEWER', 'x-tenant-id': 'T1' }, body: { intentType: 'SIMULATE', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('intentPermissionGuard: ACKNOWLEDGE_DRIFT maps to DRIFT_ACKNOWLEDGE, ECONOMIC_OPERATOR passes', () => {
  let called = false;
  const next: NextFunction = () => { called = true; };
  const req = mockReq({ headers: { 'x-user-id': 'op-1', 'x-role': 'OPERATOR', 'x-tenant-id': 'T1' }, body: { intentType: 'ACKNOWLEDGE_DRIFT', executionId: 'exec-1' } });
  const res = mockRes();
  intentPermissionGuard(req, res as unknown as Response, next);
  assert.equal(called, true);
});
