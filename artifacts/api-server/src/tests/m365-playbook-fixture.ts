import { m365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'

export function seedM365PlaybookSnapshot(tenantId = 'tenant-m365-playbooks') {
  m365SnapshotRepository.clearForTests()
  const snapshotId = `snap-${tenantId}`
  m365SnapshotRepository.upsertSnapshot({
    snapshot: { snapshotId, tenantId, capturedAt: new Date().toISOString(), source: 'MICROSOFT_GRAPH' },
    users: [
      { id: 'u-inactive', tenantId, userPrincipalName: 'inactive@example.com', displayName: 'Inactive User', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku-e5'], signInActivity: { lastSignInDateTime: '2026-01-01T00:00:00Z' }, sourceSnapshotId: snapshotId },
      { id: 'u-copilot', tenantId, userPrincipalName: 'copilot@example.com', displayName: 'Copilot User', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku-copilot'], signInActivity: { lastSignInDateTime: '2026-01-01T00:00:00Z' }, sourceSnapshotId: snapshotId },
      { id: 'u-shared', tenantId, userPrincipalName: 'support@example.com', displayName: 'Support Mailbox', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku-e3'], isSharedMailboxCandidate: true, signInActivity: { lastSignInDateTime: '2026-05-20T00:00:00Z' }, sourceSnapshotId: snapshotId },
      { id: 'u-dup', tenantId, userPrincipalName: 'duplicate@example.com', displayName: 'Duplicate User', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku-e5', 'sku-powerbi', 'sku-defender'], signInActivity: { lastSignInDateTime: '2026-05-20T00:00:00Z' }, sourceSnapshotId: snapshotId },
    ],
    licenseAssignments: [],
    skus: [
      { skuId: 'sku-e5', skuPartNumber: 'SPE_E5', prepaidEnabled: 10, consumedUnits: 8 },
      { skuId: 'sku-e3', skuPartNumber: 'SPE_E3', prepaidEnabled: 5, consumedUnits: 5 },
      { skuId: 'sku-copilot', skuPartNumber: 'COPILOT', prepaidEnabled: 10, consumedUnits: 4 },
      { skuId: 'sku-powerbi', skuPartNumber: 'POWER_BI_PRO', prepaidEnabled: 10, consumedUnits: 1 },
      { skuId: 'sku-defender', skuPartNumber: 'DEFENDER_ENDPOINT', prepaidEnabled: 10, consumedUnits: 1 },
    ],
    usageRecords: [{ id: 'usage-copilot', tenantId, userPrincipalName: 'copilot@example.com', reportType: 'OFFICE365_ACTIVE_USER', teamsActive: false, outlookActive: false, exchangeActive: false, oneDriveActive: false, sharePointActive: false, rawFields: {}, sourceSnapshotId: snapshotId }],
    mailboxes: [{ id: 'mb-support', tenantId, userPrincipalName: 'support@example.com', recipientType: 'SHARED', sourceSnapshotId: snapshotId }],
    groups: [{ id: 'g-dormant', displayName: 'legacy dormant group', ownerId: null, lastActivityDate: null } as any],
    discoveryRun: { tenantId, snapshotId, status: 'COMPLETED', counts: { users: 4, enabledUsers: 4, disabledUsers: 0, licensedUsers: 4, skus: 5, usageRecords: 1, mailboxes: 1, groups: 1 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
  })
  return { tenantId, snapshotId }
}
