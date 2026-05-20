import test from 'node:test';import assert from 'node:assert/strict';import { evaluatePostflight } from '../lib/connector-transaction-realism/connector-postflight-check';
test('postflight mismatch detected',()=>{ const r=evaluatePostflight('stopped','running'); assert.equal(r.ok,false); assert.ok(r.mismatch?.includes('expected:stopped')); assert.ok(r.mismatch?.includes('actual:running'));});
