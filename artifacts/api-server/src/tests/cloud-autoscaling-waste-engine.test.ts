import test from 'node:test'; import assert from 'node:assert/strict'; import { evaluateCloudAutoscalingWaste } from '../lib/cloud-economic-intelligence';
test('detects autoscaling waste',()=>{ const a=evaluateCloudAutoscalingWaste({tenantId:'t',resourceId:'r',monthlyCost:100,tags:{minCapacityOverprovisioned:'true'}}); assert.ok(a.estimatedMonthlyWaste>0); });
