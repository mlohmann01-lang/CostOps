import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflow, approveWorkflow, delegateWorkflow, evaluateEscalation } from '../lib/approvals/approval-workflow-engine';

test('multi-stage workflow advances correctly',()=>{
  let wf = createWorkflow({ tenantId:'t', targetType:'EXECUTION_REQUEST', targetId:'er1', workflowName:'w', riskClass:'B' });
  wf = approveWorkflow(wf, 'u1', ['OWNER']);
  assert.equal(wf.currentStage,1);
  wf = approveWorkflow(wf, 'u2', ['GOVERNANCE']);
  assert.equal(wf.approvalState,'APPROVED');
});

test('role-based approval enforced',()=>{
  const wf = createWorkflow({ tenantId:'t', targetType:'RECOMMENDATION', targetId:'r1', workflowName:'w', riskClass:'A' });
  const out = approveWorkflow(wf, 'u1', ['SECURITY']);
  assert.equal(out.auditEvents.filter((e)=>e.eventType==='APPROVAL_GRANTED').length,0);
});

test('SoD prevents same-user conflicting approvals',()=>{
  let wf = createWorkflow({ tenantId:'t', targetType:'EXECUTION_REQUEST', targetId:'er1', workflowName:'w', riskClass:'B', separationOfDutiesRequired:true });
  wf = approveWorkflow(wf, 'u1', ['OWNER']);
  const out = approveWorkflow(wf, 'u1', ['GOVERNANCE']);
  assert.equal(out.approvalState,'PARTIALLY_APPROVED');
});

test('escalation triggered after timeout',()=>{
  const wf = createWorkflow({ tenantId:'t', targetType:'SCHEDULE', targetId:'s1', workflowName:'w', riskClass:'A', escalationAfterMinutes:1 });
  const out = evaluateEscalation(wf, new Date(Date.now()+2*60000));
  assert.equal(out.approvalState,'ESCALATED');
});

test('delegated approval allowed only when policy permits',()=>{
  const a = createWorkflow({ tenantId:'t', targetType:'CAMPAIGN', targetId:'c1', workflowName:'w', riskClass:'A', delegatedApprovalAllowed:false });
  const b = delegateWorkflow(a, 'u1', 'u2', 'OWNER');
  assert.equal(Object.keys(b.approverAssignments).length,0);
  const c = createWorkflow({ tenantId:'t', targetType:'CAMPAIGN', targetId:'c1', workflowName:'w', riskClass:'A', delegatedApprovalAllowed:true });
  const d = delegateWorkflow(c, 'u1', 'u2', 'OWNER');
  assert.equal(Object.keys(d.approverAssignments).length>0,true);
});

test('stale approvals expire and tenant isolation + no execution',()=>{
  const wf = createWorkflow({ tenantId:'t1', targetType:'RECOMMENDATION', targetId:'r1', workflowName:'w', riskClass:'A' });
  wf.approvalExpiryAt = new Date(Date.now()-1000).toISOString();
  const out = approveWorkflow(wf,'u1',['OWNER']);
  assert.equal(out.approvalState,'EXPIRED');
  const wf2 = createWorkflow({ tenantId:'t2', targetType:'RECOMMENDATION', targetId:'r2', workflowName:'w2', riskClass:'A' });
  assert.equal(wf2.tenantId,'t2');
  assert.equal(('executedActions' in (wf2 as any)), false);
});
