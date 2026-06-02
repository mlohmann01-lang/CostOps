import test from 'node:test'
import assert from 'node:assert/strict'
import { seedM365PlaybookSnapshot } from './m365-playbook-fixture'
import { m365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'
import { InactiveUserReclaimPlaybook } from '../lib/playbooks/m365/inactive-user-reclaim-playbook'
import { CopilotRightsizingPlaybook } from '../lib/playbooks/m365/copilot-rightsizing-playbook'
import { SharedMailboxConversionPlaybook } from '../lib/playbooks/m365/shared-mailbox-conversion-playbook'
import { DuplicateLicensePlaybook } from '../lib/playbooks/m365/duplicate-license-playbook'
import { SecuritySkuRationalizationPlaybook } from '../lib/playbooks/m365/security-sku-rationalization-playbook'
import { assertEconomicAssessment } from './m365-hardening-test-utils'

test('all hardened playbooks emit economic assessment and safe non-eligible states', async () => {
  const { tenantId, snapshotId } = seedM365PlaybookSnapshot('tenant-playbook-hardening')
  const playbooks = [new InactiveUserReclaimPlaybook(), new CopilotRightsizingPlaybook(), new SharedMailboxConversionPlaybook(), new DuplicateLicensePlaybook(), new SecuritySkuRationalizationPlaybook()]
  for (const playbook of playbooks) {
    const out = await playbook.evaluate(tenantId, snapshotId)
    assert.ok(out.length > 0)
    for (const candidate of out) {
      assertEconomicAssessment(candidate)
      assert.notEqual(candidate.opportunityPayload.readiness, 'ELIGIBLE')
    }
  }
})

test('group-assigned inactive user is review required, not ready for approval', async () => {
  const { tenantId, snapshotId } = seedM365PlaybookSnapshot('tenant-group-assigned')
  const snapshot = m365SnapshotRepository.getLatest(tenantId)!
  snapshot.licenseAssignments.push({ id: 'la-group', tenantId, userId: 'u-inactive', skuId: 'sku-e5', skuPartNumber: 'SPE_E5', assignmentType: 'GROUP', sourceSnapshotId: snapshotId })
  m365SnapshotRepository.upsertSnapshot(snapshot)
  const out = await new InactiveUserReclaimPlaybook().evaluate(tenantId, snapshotId)
  const inactive = out.find((candidate) => candidate.entityId === 'u-inactive')!
  assert.equal(inactive.executionSafety, 'REVIEW_REQUIRED')
  assert.notEqual(inactive.productionReadiness, 'READY_FOR_APPROVAL')
})

test('protected inactive account is blocked or review-only', async () => {
  const { tenantId, snapshotId } = seedM365PlaybookSnapshot('tenant-protected-inactive')
  const snapshot = m365SnapshotRepository.getLatest(tenantId)!
  snapshot.users[0].isAdminCandidate = true
  m365SnapshotRepository.upsertSnapshot(snapshot)
  const out = await new InactiveUserReclaimPlaybook().evaluate(tenantId, snapshotId)
  const inactive = out.find((candidate) => candidate.entityId === 'u-inactive')!
  assert.equal(inactive.executionSafety, 'BLOCKED')
  assert.equal(inactive.productionReadiness, 'NOT_READY')
})
