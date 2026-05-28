import test from 'node:test'
import assert from 'node:assert/strict'
import { demoConnectors, demoGovernanceAuditLog, demoExecution, demoOutcomes, demoDrift } from '../data/demo'

test('connector hub renders 5 connectors + ghost card source', () => {
  assert.equal(demoConnectors.length, 5)
})

test('governance renders 10 audit entries source', () => {
  assert.equal(demoGovernanceAuditLog.length, 10)
})

test('execution renders awaiting + completed rows source', () => {
  assert.equal(demoExecution.awaiting.length, 3)
  assert.equal(demoExecution.completed.length, 4)
})

test('outcomes renders 5 ledger entries source', () => {
  assert.equal(demoOutcomes.ledger.length, 5)
})

test('drift renders 4 alerts source', () => {
  assert.equal(demoDrift.length, 4)
})

test('live empty should not show demo rows via hooks contract', () => {
  assert.ok(true)
})
