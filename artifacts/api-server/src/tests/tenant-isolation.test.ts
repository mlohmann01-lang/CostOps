import test from 'node:test';import assert from 'node:assert/strict';import { tenantIsolationKey } from '../lib/economic-operations-productization';
test('tenant isolation key enforces match',()=>{ assert.equal(tenantIsolationKey('a','a'),true); assert.equal(tenantIsolationKey('a','b'),false); assert.notEqual(tenantIsolationKey('x','y'),true);});
