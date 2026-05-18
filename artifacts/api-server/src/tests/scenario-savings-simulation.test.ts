import test from 'node:test';import assert from 'node:assert/strict';import { simulateScenarioSavings } from '../lib/economic-simulation';
test('savings simulation',()=>{const r=simulateScenarioSavings({scenarioId:'s',potentialSavings:100,realizationRate:0.7,reversalRisk:0.2,duplicateSuppression:0.5,governanceFriction:0.4,approvalFriction:0.3});assert.equal(r.realizedSavings>0,true);});
