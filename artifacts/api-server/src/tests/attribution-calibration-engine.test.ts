import test from 'node:test'; import assert from 'node:assert/strict'; import { calibrateOutcomeAttribution } from '../lib/economic-calibration';
test('calibrates attribution accuracy',()=>{ const x=calibrateOutcomeAttribution([{tenantId:'t',attributionId:'a',predictedContribution:0.4,actualContribution:0.5,domain:'AI'}]); assert.equal(x.results[0].directionMatch,true); assert.ok(x.score>0); });
