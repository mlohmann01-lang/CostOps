import test from 'node:test'; import assert from 'node:assert/strict'; import { normalizeCloudResourceEconomicSignal } from '../lib/cloud-economic-intelligence';
test('normalizes cloud signal deterministically',()=>{ const n=normalizeCloudResourceEconomicSignal({tenantId:'t1',resourceId:'r1',monthlyCost:100}); assert.equal(n.annualizedCost,1200); assert.equal(n.ownershipQuality,'LOW'); });
