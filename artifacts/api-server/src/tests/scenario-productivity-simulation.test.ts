import test from 'node:test';import assert from 'node:assert/strict';import { simulateScenarioProductivity } from '../lib/economic-simulation';
test('productivity simulation',()=>{const r=simulateScenarioProductivity({scenarioId:'s',productivityUplift:0.7,contractorReduction:0.4,workflowEfficiency:0.8,supportDeflection:0.6});assert.equal(r.operationalEfficiency>0.6,true);});
