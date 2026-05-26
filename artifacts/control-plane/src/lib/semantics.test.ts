import { strict as assert } from 'node:assert'
import { canonicalStates, mapToCanonicalState, seededLineage } from './semantics'

assert.ok(canonicalStates.includes('BLOCKED'))
assert.equal(mapToCanonicalState('approval_required'), 'APPROVAL_REQUIRED')
assert.equal(mapToCanonicalState('drift_open'), 'DRIFT_DETECTED')
const lineage = seededLineage('unit')
assert.equal(lineage.evidenceId, 'ev-unit')
assert.ok(lineage.lineage.length > 0)
