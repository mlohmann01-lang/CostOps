import test from 'node:test';import assert from 'node:assert/strict';import type { EconomicScenario } from '../lib/economic-simulation';
test('simulation types compile',()=>{const s:EconomicScenario={scenarioId:'s',tenantId:'t',scenarioType:'COST_OPTIMIZATION',scenarioName:'n',description:'d',assumptions:[],forecastWindow:'90D',createdAt:new Date().toISOString()};assert.equal(s.tenantId,'t');});
