import test from 'node:test';import assert from 'node:assert/strict';import { buildReplay } from '../lib/economic-operations-productization';
test('mcp parity no governance bypass',()=>{ const r=buildReplay('x'); assert.equal(r.autoMutateWeight,false); assert.equal(r.proposalOnly,true); assert.ok(r.linkedEvidence.includes('evidence://'));});
