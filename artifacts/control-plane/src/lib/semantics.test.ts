import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  canonicalStates,
  mapToCanonicalState,
  seededLineage,
  trustScoreBand,
  policyResultFromState,
  executionEligibilityFromState,
} from './semantics.js'

describe('canonicalStates', () => {
  test('contains all 11 canonical states', () => {
    const expected = [
      'UNKNOWN', 'DISCOVERED', 'UNDER_REVIEW', 'GOVERNED',
      'APPROVAL_REQUIRED', 'EXECUTION_ELIGIBLE', 'EXECUTED',
      'VERIFIED', 'DRIFT_DETECTED', 'BLOCKED', 'QUARANTINED',
    ]
    assert.equal(canonicalStates.length, expected.length)
    for (const s of expected) {
      assert.ok(canonicalStates.includes(s as never), `Missing state: ${s}`)
    }
  })

  test('BLOCKED and QUARANTINED states are distinct', () => {
    assert.ok(canonicalStates.includes('BLOCKED'))
    assert.ok(canonicalStates.includes('QUARANTINED'))
    assert.notEqual(canonicalStates.indexOf('BLOCKED'), canonicalStates.indexOf('QUARANTINED'))
  })
})

describe('mapToCanonicalState', () => {
  test('maps approval_required', () => {
    assert.equal(mapToCanonicalState('approval_required'), 'APPROVAL_REQUIRED')
  })
  test('maps drift_open', () => {
    assert.equal(mapToCanonicalState('drift_open'), 'DRIFT_DETECTED')
  })
  test('maps BLOCKED status', () => {
    assert.equal(mapToCanonicalState('BLOCKED'), 'BLOCKED')
  })
  test('maps quarantined status', () => {
    assert.equal(mapToCanonicalState('quarantined'), 'QUARANTINED')
  })
  test('maps verified', () => {
    assert.equal(mapToCanonicalState('VERIFIED'), 'VERIFIED')
  })
  test('maps executed', () => {
    assert.equal(mapToCanonicalState('EXECUTED'), 'EXECUTED')
  })
  test('maps execution_eligible', () => {
    assert.equal(mapToCanonicalState('execution_eligible'), 'EXECUTION_ELIGIBLE')
  })
  test('maps ready', () => {
    assert.equal(mapToCanonicalState('READY_TO_EXECUTE'), 'EXECUTION_ELIGIBLE')
  })
  test('maps governed', () => {
    assert.equal(mapToCanonicalState('GOVERNED'), 'GOVERNED')
  })
  test('maps under_review', () => {
    assert.equal(mapToCanonicalState('under_review'), 'UNDER_REVIEW')
  })
  test('maps discovered', () => {
    assert.equal(mapToCanonicalState('discovered'), 'DISCOVERED')
  })
  test('falls back to UNKNOWN for unrecognised input', () => {
    assert.equal(mapToCanonicalState('something_random'), 'UNKNOWN')
  })
})

describe('seededLineage', () => {
  test('returns evidenceId prefixed with ev-', () => {
    const lineage = seededLineage('unit')
    assert.equal(lineage.evidenceId, 'ev-unit')
  })
  test('lineage array is non-empty', () => {
    const lineage = seededLineage('unit')
    assert.ok(lineage.lineage.length > 0)
  })
  test('all required EvidenceLineage fields are present', () => {
    const lineage = seededLineage('test')
    assert.ok(typeof lineage.evidenceId === 'string')
    assert.ok(typeof lineage.sourceSystem === 'string')
    assert.ok(typeof lineage.observedAt === 'string')
    assert.ok(typeof lineage.confidenceScore === 'number')
    assert.ok(typeof lineage.trustScore === 'number')
    assert.ok(['PASSED','WARNING','FAILED','BLOCKED'].includes(lineage.policyResult))
    assert.ok(Array.isArray(lineage.lineage))
  })
  test('lineage entries reference seed', () => {
    const lineage = seededLineage('m365')
    assert.ok(lineage.lineage.some(l => l.includes('m365')))
  })
  test('different seeds produce different evidenceIds', () => {
    const a = seededLineage('alpha')
    const b = seededLineage('beta')
    assert.notEqual(a.evidenceId, b.evidenceId)
  })
  test('confidenceScore is between 0 and 1', () => {
    const lineage = seededLineage('scores')
    assert.ok(lineage.confidenceScore >= 0 && lineage.confidenceScore <= 1)
    assert.ok(lineage.trustScore >= 0 && lineage.trustScore <= 1)
  })
})

describe('trustScoreBand', () => {
  test('0.95 is AUTO_EXECUTE', () => {
    assert.equal(trustScoreBand(0.95), 'AUTO_EXECUTE')
  })
  test('0.90 boundary is AUTO_EXECUTE', () => {
    assert.equal(trustScoreBand(0.90), 'AUTO_EXECUTE')
  })
  test('0.80 is APPROVAL_REQUIRED', () => {
    assert.equal(trustScoreBand(0.80), 'APPROVAL_REQUIRED')
  })
  test('0.75 boundary is APPROVAL_REQUIRED', () => {
    assert.equal(trustScoreBand(0.75), 'APPROVAL_REQUIRED')
  })
  test('0.60 is INVESTIGATE', () => {
    assert.equal(trustScoreBand(0.60), 'INVESTIGATE')
  })
  test('0.50 boundary is INVESTIGATE', () => {
    assert.equal(trustScoreBand(0.50), 'INVESTIGATE')
  })
  test('0.30 is BLOCKED', () => {
    assert.equal(trustScoreBand(0.30), 'BLOCKED')
  })
  test('0.00 is BLOCKED', () => {
    assert.equal(trustScoreBand(0.00), 'BLOCKED')
  })
})

describe('policyResultFromState', () => {
  test('BLOCKED → BLOCKED', () => {
    assert.equal(policyResultFromState('BLOCKED'), 'BLOCKED')
  })
  test('QUARANTINED → BLOCKED', () => {
    assert.equal(policyResultFromState('QUARANTINED'), 'BLOCKED')
  })
  test('DRIFT_DETECTED → WARNING', () => {
    assert.equal(policyResultFromState('DRIFT_DETECTED'), 'WARNING')
  })
  test('UNDER_REVIEW → WARNING', () => {
    assert.equal(policyResultFromState('UNDER_REVIEW'), 'WARNING')
  })
  test('UNKNOWN → FAILED', () => {
    assert.equal(policyResultFromState('UNKNOWN'), 'FAILED')
  })
  test('VERIFIED → PASSED', () => {
    assert.equal(policyResultFromState('VERIFIED'), 'PASSED')
  })
  test('GOVERNED → PASSED', () => {
    assert.equal(policyResultFromState('GOVERNED'), 'PASSED')
  })
  test('EXECUTION_ELIGIBLE → PASSED', () => {
    assert.equal(policyResultFromState('EXECUTION_ELIGIBLE'), 'PASSED')
  })
  test('EXECUTED → PASSED', () => {
    assert.equal(policyResultFromState('EXECUTED'), 'PASSED')
  })
})

describe('executionEligibilityFromState', () => {
  test('EXECUTION_ELIGIBLE → ELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('EXECUTION_ELIGIBLE'), 'ELIGIBLE')
  })
  test('GOVERNED → ELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('GOVERNED'), 'ELIGIBLE')
  })
  test('BLOCKED → INELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('BLOCKED'), 'INELIGIBLE')
  })
  test('QUARANTINED → INELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('QUARANTINED'), 'INELIGIBLE')
  })
  test('APPROVAL_REQUIRED → INELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('APPROVAL_REQUIRED'), 'INELIGIBLE')
  })
  test('DRIFT_DETECTED → INELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('DRIFT_DETECTED'), 'INELIGIBLE')
  })
  test('UNDER_REVIEW → INELIGIBLE', () => {
    assert.equal(executionEligibilityFromState('UNDER_REVIEW'), 'INELIGIBLE')
  })
  test('VERIFIED → INELIGIBLE (post-execution, not re-eligible)', () => {
    assert.equal(executionEligibilityFromState('VERIFIED'), 'INELIGIBLE')
  })
})
