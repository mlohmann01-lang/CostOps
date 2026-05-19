import test from 'node:test'; import assert from 'node:assert/strict'; import { evaluateCloudEnvironmentLifecycle } from '../lib/cloud-economic-intelligence';
test('detects environment lifecycle opportunities',()=>{ const e=evaluateCloudEnvironmentLifecycle({tenantId:'t',resourceId:'r',monthlyCost:100,environmentType:'DEV',activeHours:200}); assert.equal(e.shutdownScheduleRecommended,true); });
