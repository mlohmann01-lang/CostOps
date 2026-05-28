import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize } from '../lib/security/rbac-engine';
import { resolvePermissions } from '../lib/security/permission-resolver';

test('tenant isolation enforced',()=>{
  const out = authorize({ userId:'u', tenantId:'t1', role:'TENANT_ADMIN', environment:'DEV' }, { tenantId:'t2', domain:'recommendations', action:'read' });
  assert.equal(out.ok,false);
});

test('unauthorized actions blocked + read-only enforced',()=>{
  const a = authorize({ userId:'u', tenantId:'t1', role:'READ_ONLY_OBSERVER', environment:'DEV' }, { tenantId:'t1', domain:'approvals', action:'write' });
  assert.equal(a.ok,false);
});

test('auditor export-only behavior and approver connector restriction',()=>{
  const exportOk = authorize({ userId:'u', tenantId:'t1', role:'AUDITOR', environment:'DEV' }, { tenantId:'t1', domain:'audit_exports', action:'export' });
  const approveNo = authorize({ userId:'u', tenantId:'t1', role:'AUDITOR', environment:'DEV' }, { tenantId:'t1', domain:'approvals', action:'approve' });
  const connectorNo = authorize({ userId:'u', tenantId:'t1', role:'APPROVER', environment:'DEV' }, { tenantId:'t1', domain:'connector_management', action:'write' });
  assert.equal(exportOk.ok,true); assert.equal(approveNo.ok,false); assert.equal(connectorNo.ok,false);
});

test('no privilege escalation and deterministic permission resolution',()=>{
  const p1 = resolvePermissions('EXECUTION_OPERATOR');
  const p2 = resolvePermissions('EXECUTION_OPERATOR');
  assert.deepEqual(p1,p2);
  assert.equal(p1.approvals.includes('write'), false);
});
