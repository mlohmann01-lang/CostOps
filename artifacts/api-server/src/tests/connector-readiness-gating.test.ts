import test from 'node:test';import assert from 'node:assert/strict';import { buildVerdictCard } from '../lib/economic-operations-productization';
test('readiness gating blocks unsafe connector',()=>{ const c=buildVerdictCard('t','M365','x','BLOCKED'); assert.equal(c.verdict,'BLOCKED'); assert.equal(c.rollbackAvailability,false); assert.equal(c.approvalRequirement,'DIRECTOR');});
