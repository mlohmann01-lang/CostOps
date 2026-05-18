import test from 'node:test';import assert from 'node:assert/strict';import { evaluateScenarioAssumptions } from '../lib/economic-simulation';
test('assumptions evaluated',()=>{const r=evaluateScenarioAssumptions([{assumptionId:'1',assumptionType:'SPEND_GROWTH',description:'',expectedImpact:0.2,confidence:0.7,evidenceRefs:[]}]);assert.equal(r.valid,true);});
