import test from 'node:test'; import assert from 'node:assert/strict'; import { detectEconomicRecurrence } from '../lib/economic-memory-drift';
const base={tenantId:'t',domain:'CLOUD' as const,category:'x',timestamp:'2026-01-01',savingsDelta:-1,evidenceReferences:[{id:'1',source:'s',lineageId:'l',replayId:'r',confidence:1,capturedAt:'t'}],approved:true};
test('detect recurrence',()=>{assert.equal(detectEconomicRecurrence([{...base,category:'M365'},{...base,category:'M365'}]).length,1);});
