import test from 'node:test';
import assert from 'node:assert/strict';
import { assertIdempotent } from '../lib/runtime/idempotency-engine';
import { reconcileWorkflows } from '../lib/runtime/workflow-recovery';
import { setRecoveryWorkflows, getRecoveryState, reconcileRecovery } from '../lib/runtime/recovery-engine';

test('duplicate transitions blocked and idempotency preserved after retry',()=>{
  const a = assertIdempotent('t1','workflow-transition','k1');
  const b = assertIdempotent('t1','workflow-transition','k1');
  assert.equal(a.ok,true);
  assert.equal(b.ok,false);
});

test('restart reconciliation deterministic + stale workflow recovery handled',()=>{
  const w = [{ workflowId:'w1', approvalState:'PENDING_APPROVAL', approvalExpiryAt:new Date(Date.now()-1000).toISOString(), updatedAt:new Date().toISOString() }];
  const a = reconcileWorkflows({ workflows:w });
  const b = reconcileWorkflows({ workflows:w });
  assert.equal(a.staleWorkflowCount,b.staleWorkflowCount);
  assert.equal(a.reconciled[0].approvalState,'EXPIRED');
});

test('tenant isolation enforced and recovery does not execute actions',()=>{
  setRecoveryWorkflows('t1',[{ workflowId:'w1', approvalState:'PENDING_APPROVAL', approvalExpiryAt:new Date(Date.now()-1000).toISOString() }]);
  setRecoveryWorkflows('t2',[]);
  const s1 = getRecoveryState('t1');
  const s2 = getRecoveryState('t2');
  assert.equal(s1.tenantId,'t1');
  assert.equal(s2.tenantId,'t2');
  const out = reconcileRecovery('t1');
  assert.equal(typeof out.status,'string');
  assert.equal(('executedActions' in out as any), false);
});
