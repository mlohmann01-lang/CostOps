import test from 'node:test';import assert from 'node:assert/strict';import { enforceSimulationBeforeExecution } from '../lib/economic-operations-productization';
test('simulation before execution required',()=>{ assert.equal(enforceSimulationBeforeExecution(true),true); assert.equal(enforceSimulationBeforeExecution(false),false); assert.notEqual(enforceSimulationBeforeExecution(false),true);});
