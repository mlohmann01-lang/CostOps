import test from 'node:test';import assert from 'node:assert/strict';import { buildVerdictCard } from '../lib/economic-operations-productization';
test('rollback visibility',()=>{ const c=buildVerdictCard('t','M365','a','ROLLBACK_REQUIRED'); assert.equal(c.rollbackAvailability,true); assert.equal(c.verdict,'ROLLBACK_REQUIRED'); assert.ok(c.verificationWindow);});
