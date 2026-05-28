import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSchedulingPolicy } from '../lib/scheduling/scheduling-policy-engine';
import { buildSchedule } from '../lib/scheduling/change-window-engine';

const baseReq = { executionRequestId:'er1', executionState:'APPROVED_FOR_EXECUTION', actionRiskClass:'B', rollbackRequired:true, expiresAt:new Date(Date.now()+60000).toISOString() };
const dryReady = { executionRequestId:'er1', simulationState:'READY_FOR_EXECUTION' };

test('only execution-ready requests can schedule',()=>{
  const out = evaluateSchedulingPolicy({ executionRequests:[{...baseReq, executionState:'BLOCKED'}], dryRuns:[dryReady], rollbackCoverage:100 });
  assert.equal(out.eligible,false);
});

test('stale approval blocks scheduling',()=>{
  const out = evaluateSchedulingPolicy({ executionRequests:[{...baseReq, expiresAt:new Date(Date.now()-60000).toISOString()}], dryRuns:[dryReady], rollbackCoverage:100 });
  assert.equal(out.reasons.some((r)=>r.includes('STALE_APPROVAL')), true);
});

test('degraded connector blocks scheduling',()=>{
  const out = evaluateSchedulingPolicy({ executionRequests:[baseReq], dryRuns:[dryReady], rollbackCoverage:100, connectorHealth:'DEGRADED' });
  assert.equal(out.reasons.includes('DEGRADED_CONNECTOR_BLOCK'), true);
});

test('rollback coverage required and risk aggregates',()=>{
  const out = buildSchedule({ tenantId:'t', campaignId:'c', executionRequests:[baseReq,{...baseReq, executionRequestId:'er2', actionRiskClass:'D'}], dryRuns:[dryReady,{executionRequestId:'er2', simulationState:'READY_FOR_EXECUTION'}], scheduleName:'After-hours low-risk reclaim wave', changeWindowType:'AFTER_HOURS', scheduledStart:new Date().toISOString(), scheduledEnd:new Date(Date.now()+3600000).toISOString(), timezone:'UTC', connectorHealth:'HEALTHY' });
  assert.equal(out.riskLevel, 'HIGH');
  const blocked = buildSchedule({ tenantId:'t', campaignId:'c', executionRequests:[{...baseReq, rollbackRequired:false}], dryRuns:[dryReady], scheduleName:'Manual supervision required', changeWindowType:'MANUAL_SUPERVISION_REQUIRED', scheduledStart:new Date().toISOString(), scheduledEnd:new Date(Date.now()+3600000).toISOString(), timezone:'UTC' });
  assert.equal(blocked.scheduleState, 'BLOCKED');
});

test('tenant isolation and scheduling does not execute actions',()=>{
  const a = buildSchedule({ tenantId:'t1', campaignId:'c', executionRequests:[baseReq], dryRuns:[dryReady], scheduleName:'A', changeWindowType:'BUSINESS_HOURS', scheduledStart:new Date().toISOString(), scheduledEnd:new Date(Date.now()+3600000).toISOString(), timezone:'UTC' });
  const b = buildSchedule({ tenantId:'t2', campaignId:'c', executionRequests:[baseReq], dryRuns:[dryReady], scheduleName:'B', changeWindowType:'BUSINESS_HOURS', scheduledStart:new Date().toISOString(), scheduledEnd:new Date(Date.now()+3600000).toISOString(), timezone:'UTC' });
  assert.equal(a.tenantId,'t1');
  assert.equal(b.tenantId,'t2');
  assert.equal(('executedActions' in (a as any)), false);
});
