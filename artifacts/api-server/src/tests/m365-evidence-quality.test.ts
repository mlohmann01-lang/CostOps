import test from 'node:test'
import assert from 'node:assert/strict'
import { scoreM365EvidenceQuality } from '../lib/playbooks/m365/m365-evidence-quality'
import { seedM365PlaybookSnapshot } from './m365-playbook-fixture'
import { m365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'

test('evidence quality scores inactive user evidence and missing mailbox proof conservatively', () => {
  const { tenantId } = seedM365PlaybookSnapshot('tenant-evidence-quality')
  const snapshot = m365SnapshotRepository.getLatest(tenantId)!
  const inactive = scoreM365EvidenceQuality({ playbookId: 'm365-inactive-user-reclaim', entityId: 'u-inactive', entityType: 'USER', evidence: ['user:u-inactive', 'lastSignIn:2026-01-01T00:00:00Z', 'protectedSignalsEvaluated:clear', 'license:SPE_E5'], costEstimates: [{ skuId: 'sku-e5', skuPartNumber: 'SPE_E5', monthlyUnitCost: 57, annualUnitCost: 684, currency: 'USD', source: 'CONTRACT', confidence: 'HIGH', reasons: [] }] }, snapshot)
  assert.ok(['ADEQUATE', 'STRONG'].includes(inactive.evidenceQuality))
  const mailbox = scoreM365EvidenceQuality({ playbookId: 'm365-shared-mailbox-conversion', entityId: 'missing', entityType: 'MAILBOX', evidence: ['mailbox:missing'] }, snapshot)
  assert.equal(mailbox.evidenceQuality, 'INSUFFICIENT')
})
