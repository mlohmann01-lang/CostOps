import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConnectorHealth } from '../lib/observability/connector-health';
import { aggregateRuntimeStatus } from '../lib/observability/system-status-engine';
import { computeRuntimeMetrics } from '../lib/observability/runtime-metrics';
import { getRuntimeHealth, setRuntimeSnapshot } from '../lib/observability/runtime-health';

test('connector health transitions normalize correctly',()=>{
  assert.equal(normalizeConnectorHealth('auth_error'),'AUTH_FAILURE');
  assert.equal(normalizeConnectorHealth('rate_limited'),'RATE_LIMITED');
  assert.equal(normalizeConnectorHealth('stale'),'STALE_DATA');
});

test('runtime status aggregation deterministic + degraded connector reflected',()=>{
  const m = computeRuntimeMetrics({ failedVerificationCount: 0, staleApprovalCount: 0 });
  const a = aggregateRuntimeStatus({ connectors:['DEGRADED'], schedulerHealthy:true, metrics:m });
  const b = aggregateRuntimeStatus({ connectors:['DEGRADED'], schedulerHealthy:true, metrics:m });
  assert.equal(a,b);
  assert.equal(a,'DEGRADED');
});

test('stale metrics counted correctly + tenant isolation + no mutation',()=>{
  setRuntimeSnapshot('t1',{ connectors:[{name:'m365',health:'HEALTHY'}], metrics:{ staleRecommendationCount:3, staleApprovalCount:2, policyEvaluationActivity:1 }, schedulerHealthy:true });
  setRuntimeSnapshot('t2',{ connectors:[{name:'m365',health:'UNAVAILABLE'}], metrics:{ staleRecommendationCount:0, staleApprovalCount:0 }, schedulerHealthy:true });
  const h1 = getRuntimeHealth('t1');
  const h2 = getRuntimeHealth('t2');
  assert.equal(h1.metrics.staleRecommendationCount,3);
  assert.equal(h1.metrics.staleApprovalCount,2);
  assert.equal(h2.runtimeStatus,'PARTIAL_OUTAGE');
  assert.equal(('mutated' in h1 as any), false);
});
