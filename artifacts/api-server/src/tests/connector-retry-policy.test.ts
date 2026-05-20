import test from 'node:test';import assert from 'node:assert/strict';import { getRetryBudget } from '../lib/connector-transaction-realism/connector-retry-policy';
test('retry bounded',()=>{ assert.equal(getRetryBudget('PROVIDER_RATE_LIMITED'),3); assert.equal(getRetryBudget('PROVIDER_TIMEOUT'),2); assert.equal(getRetryBudget('PROVIDER_REJECTED'),0);});
