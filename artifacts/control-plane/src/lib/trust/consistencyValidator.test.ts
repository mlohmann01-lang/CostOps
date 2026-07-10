import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkConsistency } from './consistencyValidator'

test('flags READINESS_CONTRADICTION when readiness is 0% with no required actions', () => {
  const warnings = checkConsistency({ readiness: 0, requiredActionsCount: 0 })
  assert.deepEqual(warnings, ['READINESS_CONTRADICTION'])
})

test('does not flag READINESS_CONTRADICTION when readiness is 0% but actions remain', () => {
  const warnings = checkConsistency({ readiness: 0, requiredActionsCount: 3 })
  assert.equal(warnings.includes('READINESS_CONTRADICTION'), false)
})

test('flags RETENTION_CONTRADICTION when there are zero protected outcomes but a positive retention rate', () => {
  const warnings = checkConsistency({ protectedOutcomes: 0, retentionRate: 100 })
  assert.deepEqual(warnings, ['RETENTION_CONTRADICTION'])
})

test('does not flag RETENTION_CONTRADICTION when zero protected outcomes and retention rate is null', () => {
  const warnings = checkConsistency({ protectedOutcomes: 0, retentionRate: null })
  assert.equal(warnings.includes('RETENTION_CONTRADICTION'), false)
})

test('flags CONNECTOR_CONTRADICTION when connector is not connected but overall state is healthy', () => {
  const warnings = checkConsistency({ connectorStatus: 'NOT_CONNECTED', overallState: 'HEALTHY' })
  assert.deepEqual(warnings, ['CONNECTOR_CONTRADICTION'])
})

test('does not flag CONNECTOR_CONTRADICTION when connector is connected', () => {
  const warnings = checkConsistency({ connectorStatus: 'CONNECTED', overallState: 'HEALTHY' })
  assert.equal(warnings.includes('CONNECTOR_CONTRADICTION'), false)
})

test('returns no warnings for a fully consistent passing state', () => {
  const warnings = checkConsistency({
    readiness: 100,
    requiredActionsCount: 0,
    protectedOutcomes: 5,
    retentionRate: 92,
    connectorStatus: 'CONNECTED',
    overallState: 'HEALTHY',
  })
  assert.deepEqual(warnings, [])
})

test('returns multiple warnings when several contradictions are present simultaneously', () => {
  const warnings = checkConsistency({
    readiness: 0,
    requiredActionsCount: 0,
    protectedOutcomes: 0,
    retentionRate: 100,
    connectorStatus: 'NOT_CONNECTED',
    overallState: 'HEALTHY',
  })
  assert.deepEqual(warnings, ['READINESS_CONTRADICTION', 'RETENTION_CONTRADICTION', 'CONNECTOR_CONTRADICTION'])
})
