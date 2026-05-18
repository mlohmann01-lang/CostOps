import test from 'node:test';import assert from 'node:assert/strict';import { simulateScenarioSpend } from '../lib/economic-simulation';
test('spend simulation',()=>{const r=simulateScenarioSpend({scenarioId:'s',saasSpend:100,aiSpend:50,duplicateSpend:20,premiumSpend:10,consolidationEffectiveness:0.5,spendGrowth:0.2});assert.equal(r.projectedConsolidationSavings,10);});
