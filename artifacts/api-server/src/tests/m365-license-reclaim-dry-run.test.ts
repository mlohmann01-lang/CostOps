import test from 'node:test'
import assert from 'node:assert/strict'
import { runM365LicenseReclaimDryRun } from '../lib/execution/m365-license-reclaim-dry-run'
import { inactiveReclaimOpportunity, trustReport, executionSnapshot } from './m365-execution-test-fixture'

async function dry(snapshot = executionSnapshot(), extra = {}) { return runM365LicenseReclaimDryRun({ tenantId: 'tenant-exec', opportunity: inactiveReclaimOpportunity(), snapshot, trust: trustReport('HIGH'), approvalState: 'APPROVED', userId: 'u1', skuId: 'sku-e5', writeReady: true, ...extra }) }

test('dry run ready path validates user license trust approval write readiness and rollback', async () => {
  const out = await dry()
  assert.equal(out.status, 'READY')
  assert.deepEqual(out.expectedAfterState.assignedLicenses, [])
  assert.equal(out.rollbackPlan.supported, true)
})

test('dry run blocks admin service shared no-reply and group-assigned candidates', async () => {
  for (const flag of ['isAdminCandidate', 'isServiceAccountCandidate', 'isSharedMailboxCandidate', 'isNoReplyCandidate']) {
    const snapshot = executionSnapshot()
    ;(snapshot.users[0] as any)[flag] = true
    const out = await dry(snapshot)
    assert.equal(out.status, 'BLOCKED')
  }
  const group = executionSnapshot()
  group.licenseAssignments[0].assignmentType = 'GROUP'
  assert.equal((await dry(group)).status, 'BLOCKED')
})

test('dry run blocks missing approval write readiness and trust failure', async () => {
  assert.equal((await dry(executionSnapshot(), { approvalState: 'PENDING' })).status, 'BLOCKED')
  assert.equal((await dry(executionSnapshot(), { writeReady: false })).status, 'BLOCKED')
  assert.equal((await dry(executionSnapshot(), { trust: trustReport('INVESTIGATE') })).status, 'BLOCKED')
})


test('dry run blocks missing or unknown assignment evidence', async () => {
  const missing = executionSnapshot({ licenseAssignments: [] })
  assert.equal((await dry(missing)).status, 'BLOCKED')
  const unknown = executionSnapshot()
  unknown.licenseAssignments[0].assignmentType = 'UNKNOWN'
  const out = await dry(unknown)
  assert.equal(out.status, 'BLOCKED')
  assert.ok(out.blockers.some((blocker) => blocker.includes('Unknown license assignment type')))
})
