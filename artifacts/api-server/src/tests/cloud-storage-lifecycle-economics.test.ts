import test from 'node:test'; import assert from 'node:assert/strict'; import { evaluateCloudStorageLifecycleEconomics } from '../lib/cloud-economic-intelligence';
test('evaluates storage lifecycle economics',()=>{ const s=evaluateCloudStorageLifecycleEconomics({tenantId:'t',resourceId:'r',monthlyCost:100,tags:{lifecyclePolicyMissing:'true'}}); assert.equal(s.lifecyclePolicyRecommended,true); });
