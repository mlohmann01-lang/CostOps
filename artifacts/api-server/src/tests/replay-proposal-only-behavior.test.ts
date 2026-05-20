import test from 'node:test';import assert from 'node:assert/strict';import { buildReplay } from '../lib/economic-operations-productization';
test('replay proposal only',()=>{ const r=buildReplay('x'); assert.equal(r.proposalOnly,true); assert.equal(r.autoMutateWeight,false); assert.ok(r.differences.length>0);});
