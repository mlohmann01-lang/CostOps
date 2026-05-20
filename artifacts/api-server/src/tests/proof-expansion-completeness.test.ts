import test from 'node:test';import assert from 'node:assert/strict';import { buildTimeline } from '../lib/economic-operations-productization';
test('proof references exist for timeline',()=>{ const t=buildTimeline('x'); assert.equal(t.length,14); assert.ok(t.every(e=>e.evidenceRef.startsWith('evidence://'))); assert.ok(t.some(e=>e.stage==='Verification pending'));});
