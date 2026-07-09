import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultOutcomeFinance } from './defaultOutcomeFinance'

test('getDefaultOutcomeFinance returns a valid OutcomeFinanceSummary', () => {
  const summary = getDefaultOutcomeFinance()
  assert.ok(summary.metrics)
  assert.ok(summary.reconciliation)
  assert.ok(Array.isArray(summary.links))
  assert.ok(['no_data', 'partial', 'active'].includes(summary.state))
  assert.equal(typeof summary.narrative, 'string')
  assert.equal(typeof summary.executiveNarrative, 'string')
})

test('variance computation is consistent with identifiedValue and financeVerifiedValue', () => {
  const summary = getDefaultOutcomeFinance()
  const { identifiedValue, financeVerifiedValue, variance } = summary.metrics
  if (identifiedValue !== undefined && financeVerifiedValue !== undefined) {
    assert.equal(variance, identifiedValue - financeVerifiedValue)
  } else {
    assert.equal(variance, undefined)
  }
})

test('state is one of the three allowed values', () => {
  const summary = getDefaultOutcomeFinance()
  assert.ok(['no_data', 'partial', 'active'].includes(summary.state))
})

test('narrative text is non-empty and consistent with state', () => {
  const summary = getDefaultOutcomeFinance()
  assert.ok(summary.narrative.length > 0)
  assert.ok(summary.executiveNarrative.length > 0)
  if (summary.state === 'no_data') {
    assert.ok(summary.narrative.includes('not yet active'))
    assert.ok(summary.executiveNarrative.includes('No finance validated outcomes exist yet'))
  } else if (summary.state === 'active') {
    assert.ok(summary.narrative.includes('reconciling verified outcomes'))
  } else {
    assert.ok(summary.narrative.includes('finance reconciliation remains incomplete'))
  }
})

test('links and reconciliation summary are structurally valid', () => {
  const summary = getDefaultOutcomeFinance()
  for (const link of summary.links) {
    assert.equal(typeof link.outcome, 'string')
    assert.equal(typeof link.status, 'string')
    assert.equal(typeof link.financeEvidence, 'string')
    assert.equal(typeof link.confidence, 'number')
    assert.equal(typeof link.lastUpdated, 'string')
  }
})
