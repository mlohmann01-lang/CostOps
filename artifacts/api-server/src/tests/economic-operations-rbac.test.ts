import test from 'node:test';
import assert from 'node:assert/strict';
import { EconomicOperationsRbac, requireOperatorPermission } from '../lib/economic-operations-rbac';

function makeRbac() { return new EconomicOperationsRbac(); }
const base = { tenantId: 'T1', actorId: 'actor-1' };

test('OWNER has all permissions', () => {
  const rbac = makeRbac();
  const perms: Array<Parameters<EconomicOperationsRbac['hasPermission']>[1]> = ['EXECUTION_RUN', 'ROLLBACK_RUN', 'AUDIT_READ', 'CONNECTOR_CONFIGURE', 'APPROVAL_GRANT'];
  for (const p of perms) {
    assert.equal(rbac.hasPermission('OWNER', p), true, `OWNER should have ${p}`);
  }
});

test('VIEWER has only read permissions', () => {
  const rbac = makeRbac();
  assert.equal(rbac.hasPermission('VIEWER', 'TENANT_READ'), true);
  assert.equal(rbac.hasPermission('VIEWER', 'RECOMMENDATION_READ'), true);
  assert.equal(rbac.hasPermission('VIEWER', 'EXECUTION_RUN'), false);
  assert.equal(rbac.hasPermission('VIEWER', 'ROLLBACK_RUN'), false);
  assert.equal(rbac.hasPermission('VIEWER', 'CONNECTOR_CONFIGURE'), false);
});

test('AUDITOR is read-only', () => {
  const rbac = makeRbac();
  assert.equal(rbac.hasPermission('AUDITOR', 'AUDIT_READ'), true);
  assert.equal(rbac.hasPermission('AUDITOR', 'RECOMMENDATION_READ'), true);
  assert.equal(rbac.hasPermission('AUDITOR', 'EXECUTION_RUN'), false);
  assert.equal(rbac.hasPermission('AUDITOR', 'APPROVAL_GRANT'), false);
});

test('APPROVER cannot execute or configure connectors', () => {
  const rbac = makeRbac();
  assert.equal(rbac.hasPermission('APPROVER', 'APPROVAL_GRANT'), true);
  assert.equal(rbac.hasPermission('APPROVER', 'EXECUTION_RUN'), false);
  assert.equal(rbac.hasPermission('APPROVER', 'CONNECTOR_CONFIGURE'), false);
});

test('ECONOMIC_OPERATOR cannot grant approvals', () => {
  const rbac = makeRbac();
  assert.equal(rbac.hasPermission('ECONOMIC_OPERATOR', 'EXECUTION_REQUEST'), true);
  assert.equal(rbac.hasPermission('ECONOMIC_OPERATOR', 'APPROVAL_GRANT'), false);
  assert.equal(rbac.hasPermission('ECONOMIC_OPERATOR', 'EXECUTION_RUN'), false);
});

test('CONNECTOR_ADMIN can configure connectors but not execute', () => {
  const rbac = makeRbac();
  assert.equal(rbac.hasPermission('CONNECTOR_ADMIN', 'CONNECTOR_CONFIGURE'), true);
  assert.equal(rbac.hasPermission('CONNECTOR_ADMIN', 'EXECUTION_RUN'), false);
  assert.equal(rbac.hasPermission('CONNECTOR_ADMIN', 'ROLLBACK_RUN'), false);
});

test('check returns allowed for permitted role+permission', () => {
  const rbac = makeRbac();
  const result = rbac.check({ ...base, role: 'ADMIN', permission: 'EXECUTION_RUN' });
  assert.equal(result.allowed, true);
});

test('check returns denied for unpermitted role+permission', () => {
  const rbac = makeRbac();
  const result = rbac.check({ ...base, role: 'VIEWER', permission: 'EXECUTION_RUN' });
  assert.equal(result.allowed, false);
});

test('denied actions are logged in audit trail', () => {
  const rbac = makeRbac();
  rbac.check({ ...base, role: 'VIEWER', permission: 'EXECUTION_RUN' });
  const denied = rbac.getDeniedAuditEntries();
  assert.equal(denied.length, 1);
  assert.equal(denied[0].permission, 'EXECUTION_RUN');
  assert.equal(denied[0].role, 'VIEWER');
});

test('requirePermission throws for denied access', () => {
  const rbac = makeRbac();
  assert.throws(() => rbac.requirePermission({ ...base, role: 'VIEWER', permission: 'ROLLBACK_RUN' }), /RBAC_DENIED/);
});

test('requirePermission does not throw for allowed access', () => {
  const rbac = makeRbac();
  assert.doesNotThrow(() => rbac.requirePermission({ ...base, role: 'ECONOMIC_OPERATOR', permission: 'SIMULATION_RUN' }));
});

test('operator cannot approve own high-risk execution', () => {
  const rbac = makeRbac();
  assert.equal(rbac.canApproveOwnExecution('ECONOMIC_OPERATOR', true, true), false);
});

test('operator can approve own low-risk execution', () => {
  const rbac = makeRbac();
  assert.equal(rbac.canApproveOwnExecution('APPROVER', true, false), true);
});

test('owner can approve own high-risk execution', () => {
  const rbac = makeRbac();
  assert.equal(rbac.canApproveOwnExecution('OWNER', true, true), true);
});

test('requireOperatorPermission function works for allowed roles', () => {
  assert.doesNotThrow(() => requireOperatorPermission('ADMIN', 'EXECUTION_RUN'));
});

test('requireOperatorPermission throws for denied roles', () => {
  assert.throws(() => requireOperatorPermission('VIEWER', 'EXECUTION_RUN'), /RBAC_DENIED/);
});

test('getPermissionsForRole returns all permissions for OWNER', () => {
  const rbac = makeRbac();
  const perms = rbac.getPermissionsForRole('OWNER');
  assert.ok(perms.includes('EXECUTION_RUN'));
  assert.ok(perms.includes('ROLLBACK_RUN'));
  assert.ok(perms.includes('AUDIT_READ'));
  assert.ok(perms.includes('CONNECTOR_CONFIGURE'));
});
