import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateM365ExecutionEligibility } from '../lib/execution/m365-execution-eligibility'
import { inactiveReclaimOpportunity, trustReport, executionSnapshot } from './m365-execution-test-fixture'

test('ready inactive reclaim candidate is execution ready', () => {
  const out = evaluateM365ExecutionEligibility({ opportunity: inactiveReclaimOpportunity(), trust: trustReport('HIGH'), snapshot: executionSnapshot(), approvalState: 'APPROVED' })
  assert.equal(out.eligible, true)
  assert.equal(out.classification, 'EXECUTION_READY')
})

test('non-inactive playbook and trust failure are blocked', () => {
  const wrong = evaluateM365ExecutionEligibility({ opportunity: inactiveReclaimOpportunity({ playbookId: 'm365-copilot-rightsizing' }), trust: trustReport('HIGH'), snapshot: executionSnapshot(), approvalState: 'APPROVED' })
  assert.equal(wrong.classification, 'BLOCKED')
  const trustFail = evaluateM365ExecutionEligibility({ opportunity: inactiveReclaimOpportunity(), trust: trustReport('INVESTIGATE'), snapshot: executionSnapshot(), approvalState: 'APPROVED' })
  assert.equal(trustFail.eligible, false)
})


test('unsupported execution type and mutation are blocked', () => {
  const out = evaluateM365ExecutionEligibility({ opportunity: inactiveReclaimOpportunity({ executionType: 'DUPLICATE_LICENSE_REVIEW', mutationType: 'REMOVE_LICENSE' }), trust: trustReport('HIGH'), snapshot: executionSnapshot(), approvalState: 'APPROVED' })
  assert.equal(out.eligible, false)
  assert.equal(out.classification, 'BLOCKED')
  assert.ok(out.blockers.some((blocker) => blocker.includes('INACTIVE_USER_LICENSE_RECLAIM')))
  assert.ok(out.blockers.some((blocker) => blocker.includes('REMOVE_M365_LICENSE')))
})
