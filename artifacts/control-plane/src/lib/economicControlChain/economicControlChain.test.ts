import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultEconomicControlChain } from './defaultEconomicControlChain'

const EXPECTED_KEYS = ['DISCOVER', 'OWN', 'ANALYSE', 'APPROVE', 'EXECUTE', 'VERIFY', 'PROTECT']

test('getDefaultEconomicControlChain returns exactly 7 stages in the correct order', () => {
  const summary = getDefaultEconomicControlChain()
  assert.equal(summary.stages.length, 7)
  assert.deepEqual(summary.stages.map((stage) => stage.key), EXPECTED_KEYS)
})

test('activeStageCount matches the actual number of active stages', () => {
  const summary = getDefaultEconomicControlChain()
  const actualActiveCount = summary.stages.filter((stage) => stage.active).length
  assert.equal(summary.activeStageCount, actualActiveCount)
})

test('healthStatus is consistent with activeStageCount for the default data', () => {
  const summary = getDefaultEconomicControlChain()
  assert.ok(['Healthy', 'Partial', 'Setup Required'].includes(summary.healthStatus))
  if (summary.activeStageCount === 0) {
    assert.equal(summary.healthStatus, 'Setup Required')
  } else if (summary.activeStageCount === 7) {
    assert.equal(summary.healthStatus, 'Healthy')
  } else {
    assert.equal(summary.healthStatus, 'Partial')
  }
})

test('narrative is a non-empty string consistent with the active count tier', () => {
  const summary = getDefaultEconomicControlChain()
  assert.ok(summary.narrative.length > 0)
  if (summary.activeStageCount === 0) {
    assert.ok(summary.narrative.includes('not yet completed discovery'))
  } else if (summary.activeStageCount === 7) {
    assert.ok(summary.narrative.includes('identifying opportunities'))
  } else {
    assert.ok(typeof summary.narrative === 'string' && summary.narrative.length > 0)
  }
})
