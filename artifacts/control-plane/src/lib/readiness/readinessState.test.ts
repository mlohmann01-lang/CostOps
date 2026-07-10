import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveReadinessSummary, type ReadinessInput } from './readinessState'

const allFalse: ReadinessInput = {
  connectorConnected: false,
  discoveryComplete: false,
  recommendationsAvailable: false,
  trustReady: false,
  executionReady: false,
}

test('deriveReadinessSummary with all-false input gives 0% readiness with blockers and next actions', () => {
  const summary = deriveReadinessSummary(allFalse)
  assert.equal(summary.readinessPercent, 0)
  assert.ok(summary.nextActions.length > 0)
  assert.ok(summary.blockers.length > 0)
  assert.equal(summary.status, 'blocked')
})

test('deriveReadinessSummary with all-true input gives 100% readiness with no blockers', () => {
  const summary = deriveReadinessSummary({
    connectorConnected: true,
    discoveryComplete: true,
    recommendationsAvailable: true,
    trustReady: true,
    executionReady: true,
  })
  assert.equal(summary.readinessPercent, 100)
  assert.equal(summary.blockers.length, 0)
  assert.equal(summary.status, 'ready')
})
