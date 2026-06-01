import type { M365DiscoveryResult, M365LicenseAssignment, M365Mailbox, M365SubscribedSku, M365TenantSnapshot, M365UsageRecord, M365User } from './m365-types'

export type M365SnapshotBundle = { snapshot: M365TenantSnapshot; users: M365User[]; licenseAssignments: M365LicenseAssignment[]; skus: M365SubscribedSku[]; usageRecords: M365UsageRecord[]; mailboxes: M365Mailbox[]; groups: Array<{ id: string; displayName?: string }>; discoveryRun: M365DiscoveryResult }

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) }

export class M365SnapshotRepository {
  private static bundles = new Map<string, M365SnapshotBundle>()
  private static latestByTenant = new Map<string, string>()
  private static runs = new Map<string, M365DiscoveryResult[]>()

  upsertSnapshot(bundle: M365SnapshotBundle) {
    M365SnapshotRepository.bundles.set(bundle.snapshot.snapshotId, clone(bundle))
    M365SnapshotRepository.latestByTenant.set(bundle.snapshot.tenantId, bundle.snapshot.snapshotId)
    const runs = M365SnapshotRepository.runs.get(bundle.snapshot.tenantId) ?? []
    M365SnapshotRepository.runs.set(bundle.snapshot.tenantId, [clone(bundle.discoveryRun), ...runs.filter((run) => run.snapshotId !== bundle.snapshot.snapshotId)])
    return clone(bundle)
  }
  getLatest(tenantId: string) { const id = M365SnapshotRepository.latestByTenant.get(tenantId); return id ? clone(M365SnapshotRepository.bundles.get(id) ?? null) : null }
  listRuns(tenantId: string) { return clone(M365SnapshotRepository.runs.get(tenantId) ?? []) }
  listUsers(tenantId: string) { return this.getLatest(tenantId)?.users ?? [] }
  listLicenses(tenantId: string) { return this.getLatest(tenantId)?.licenseAssignments ?? [] }
  listUsage(tenantId: string) { return this.getLatest(tenantId)?.usageRecords ?? [] }
  listMailboxes(tenantId: string) { return this.getLatest(tenantId)?.mailboxes ?? [] }
  clearForTests() { M365SnapshotRepository.bundles.clear(); M365SnapshotRepository.latestByTenant.clear(); M365SnapshotRepository.runs.clear() }
}

export const m365SnapshotRepository = new M365SnapshotRepository()
