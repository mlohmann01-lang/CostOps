import test from 'node:test'
import assert from 'node:assert/strict'
import { M365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'
import { M365TrustService } from '../lib/connectors/m365/m365-trust'

test('trust report includes dimension score, band and reasons', async () => {
  const repo = new M365SnapshotRepository(); repo.clearForTests()
  repo.upsertSnapshot({ snapshot: { snapshotId: 'snap-trust', tenantId: 'tenant-trust', capturedAt: new Date().toISOString(), source: 'MICROSOFT_GRAPH' }, users: [{ id: 'u1', tenantId: 'tenant-trust', userPrincipalName: 'user@example.com', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku1'], signInActivity: { lastSignInDateTime: '2026-05-01T00:00:00Z' }, sourceSnapshotId: 'snap-trust' }], licenseAssignments: [{ id: 'la1', tenantId: 'tenant-trust', userId: 'u1', skuId: 'sku1', assignmentType: 'DIRECT', sourceSnapshotId: 'snap-trust' }], skus: [{ skuId: 'sku1', skuPartNumber: 'E5', prepaidEnabled: 10, consumedUnits: 1 }], usageRecords: [{ id: 'ur1', tenantId: 'tenant-trust', userPrincipalName: 'user@example.com', reportType: 'OFFICE365_ACTIVE_USER', rawFields: {}, sourceSnapshotId: 'snap-trust' }], mailboxes: [{ id: 'mb1', tenantId: 'tenant-trust', userPrincipalName: 'user@example.com', sourceSnapshotId: 'snap-trust' }], groups: [], discoveryRun: { tenantId: 'tenant-trust', snapshotId: 'snap-trust', status: 'COMPLETED', counts: { users: 1, enabledUsers: 1, disabledUsers: 0, licensedUsers: 1, skus: 1, usageRecords: 1, mailboxes: 1, groups: 0 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() } })
  const report = await new M365TrustService(repo).generateTrustReport('tenant-trust')
  for (const dim of [report.identityTrust, report.licenseTrust, report.usageTrust, report.activityTrust, report.mailboxTrust, report.executionSafetyTrust]) { assert.equal(typeof dim.score, 'number'); assert.ok(dim.band); assert.ok(dim.reasons.length > 0) }
  assert.equal(report.executionSafetyTrust.band, 'LOW_CONFIDENCE')
})
