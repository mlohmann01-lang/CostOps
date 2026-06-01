import test from 'node:test'
import assert from 'node:assert/strict'
import { M365DiscoveryService } from '../lib/connectors/m365/m365-discovery-service'
import { M365SnapshotRepository } from '../lib/connectors/m365/m365-snapshot-repository'

const readiness = { tenantId: 'tenant-m365', authState: 'READY' as const, readReady: true, writeReady: false, requiredReadPermissions: [], requiredWritePermissions: [], graphReachable: true, tokenAcquired: true, blockers: [], warnings: [], checkedAt: new Date().toISOString() }

test('discovery normalizes users, licenses, usage and mailboxes', async () => {
  const repo = new M365SnapshotRepository(); repo.clearForTests()
  const svc = new M365DiscoveryService(repo)
  const result = await svc.discover({ tenantId: 'tenant-m365', readiness, client: {
    getOrganization: async () => [{ id: 'org', displayName: 'Org' }], getSubscribedSkus: async () => [{ skuId: 'sku1', skuPartNumber: 'E5', prepaidUnits: { enabled: 10 }, consumedUnits: 1 }], getUsersPage: async () => ({ value: [{ id: 'u1', userPrincipalName: 'admin@example.com', displayName: 'Admin', accountEnabled: true, userType: 'Member', assignedLicenses: [{ skuId: 'sku1' }], signInActivity: { lastSignInDateTime: '2026-05-01T00:00:00Z' } }] }), getUserLicenseDetails: async () => [{ skuId: 'sku1', skuPartNumber: 'E5' }], getOffice365ActiveUserDetail: async () => 'User Principal Name,Teams Active,Last Activity Date\nadmin@example.com,Yes,2026-05-30', getMailboxUsageDetail: async () => 'User Principal Name,Recipient Type,Item Count,Last Activity Date\nadmin@example.com,User,10,2026-05-30', getGroupsPage: async () => ({ value: [{ id: 'g1' }] })
  } as any })
  assert.equal(result.status, 'COMPLETED')
  assert.equal(result.counts.users, 1)
  assert.equal(repo.getLatest('tenant-m365')?.licenseAssignments.length, 1)
})

test('Reports API unavailable produces PARTIAL discovery', async () => {
  const repo = new M365SnapshotRepository(); repo.clearForTests()
  const svc = new M365DiscoveryService(repo)
  const result = await svc.discover({ tenantId: 'tenant-m365-partial', readiness, client: { getOrganization: async () => [], getSubscribedSkus: async () => [], getUsersPage: async () => ({ value: [] }), getUserLicenseDetails: async () => [], getOffice365ActiveUserDetail: async () => { throw new Error('reports') }, getMailboxUsageDetail: async () => { throw new Error('mailbox') }, getGroupsPage: async () => ({ value: [] }) } as any })
  assert.equal(result.status, 'PARTIAL')
  assert.ok(result.warnings.some((w) => w.includes('Reports API')))
})
