import { test } from 'node:test'
import assert from 'node:assert/strict'
import { outstandingRequirementsCount, readinessDelta } from '../pages/TenantReadiness'

test('0% readiness never claims "0 requirements remain"', () => {
  const outstanding = outstandingRequirementsCount(0, 4)
  const delta = readinessDelta(0, outstanding)
  assert.equal(outstanding, 4)
  assert.equal(delta.includes('0 onboarding requirements remain'), false)
  assert.equal(delta.includes('0 requirements remain'), false)
  assert.match(delta, /^4 onboarding requirements remain\. Connect your first source to begin onboarding\.$/)
})

test('partial readiness (0 < x < 100) never claims onboarding is complete', () => {
  const outstanding = outstandingRequirementsCount(2, 2)
  const delta = readinessDelta(50, outstanding)
  assert.equal(delta.includes('Onboarding complete'), false)
  assert.equal(delta.includes('No required actions remain'), false)
  assert.match(delta, /^2 onboarding requirements remain\. See Next Actions below\.$/)
})

test('partial readiness with no actions reported still avoids a false "all clear" claim', () => {
  const outstanding = outstandingRequirementsCount(0, 0)
  const delta = readinessDelta(50, outstanding)
  assert.equal(delta.includes('Onboarding complete'), false)
  assert.equal(delta.includes('No required actions remain'), false)
  assert.equal(delta, 'Onboarding requirements remain. See Next Actions below.')
})

test('100% readiness is the only state allowed to claim no required actions remain', () => {
  const outstanding = outstandingRequirementsCount(0, 0)
  const delta = readinessDelta(100, outstanding)
  assert.equal(delta, 'No required actions remain')
})

test('outstandingRequirementsCount uses the larger of requiredActions/nextActions so the two sections cannot contradict each other', () => {
  assert.equal(outstandingRequirementsCount(0, 5), 5)
  assert.equal(outstandingRequirementsCount(3, 0), 3)
  assert.equal(outstandingRequirementsCount(0, 0), 0)
})

test('singular vs plural wording is correct at the boundary of exactly one requirement', () => {
  const delta = readinessDelta(0, 1)
  assert.match(delta, /^1 onboarding requirement remain\. Connect your first source to begin onboarding\.$/)
})
