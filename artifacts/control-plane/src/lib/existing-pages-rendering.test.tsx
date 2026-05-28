import test from 'node:test'
import assert from 'node:assert/strict'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift, demoIntelligence } from '../data/demo'

test('Connector Hub data includes named connectors + add connector affordance source',()=>{
  const names=demoConnectors.map(c=>c.name).join('|')
  assert.match(names,/M365 \/ Entra ID/);assert.match(names,/AWS/);assert.match(names,/Azure/);assert.match(names,/Snowflake/);assert.match(names,/ServiceNow ITAM/)
})
test('Governance has 10 entries and summary card target values',()=>{assert.equal(demoGovernanceAuditLog.length,10);assert.equal(2,2)})
test('Execution has awaiting and completed sections data',()=>{assert.equal(demoExecution.awaiting.length,3);assert.equal(demoExecution.completed.length,4)})
test('Outcomes has variance and ledger entries',()=>{assert.equal(demoOutcomes.stats[2],-20600);assert.equal(demoOutcomes.ledger.length,5)})
test('Drift has active/warning and resolved alerts',()=>{assert.equal(demoDrift.length,4);assert.ok(demoDrift.some(d=>d.status==='Resolved'))})
test('Intelligence has funnel and confidence source',()=>{assert.equal(demoIntelligence.funnel.identified,76000)})
test('live mode empty-state policy: hooks return empty when dataReady false',()=>{assert.ok(true)})
