import { platformEventService } from '../../events/platform-event-service'
import { checkM365Readiness } from './m365-readiness'
import { M365GraphClient } from './m365-graph-client'
import { m365SnapshotRepository, type M365SnapshotBundle } from './m365-snapshot-repository'
import type { M365DiscoveryResult, M365LicenseAssignment, M365Mailbox, M365SubscribedSku, M365UsageRecord, M365User } from './m365-types'

type DiscoveryClient = Pick<M365GraphClient, 'getOrganization' | 'getSubscribedSkus' | 'getUsersPage' | 'getUserLicenseDetails' | 'getOffice365ActiveUserDetail' | 'getMailboxUsageDetail' | 'getGroupsPage'>
export type M365DiscoveryOptions = { tenantId: string; client?: DiscoveryClient; maxUsers?: number; perPage?: number; readiness?: Awaited<ReturnType<typeof checkM365Readiness>> }

function isService(upn: string, displayName = '') { return /(svc|service|automation|daemon)/i.test(`${upn} ${displayName}`) }
function isNoReply(upn: string) { return /(noreply|no-reply|donotreply)/i.test(upn) }
function isShared(upn: string, displayName = '') { return /(shared|mailbox)/i.test(`${upn} ${displayName}`) }
function parseCsv(text: string) { const [headerLine, ...lines] = String(text || '').trim().split(/\r?\n/); if (!headerLine) return []; const headers = headerLine.split(',').map((h) => h.trim()); return lines.filter(Boolean).map((line) => { const cols = line.split(','); return Object.fromEntries(headers.map((h, i) => [h, cols[i]?.trim() ?? ''])) }) }
function truthy(value: unknown) { return ['true', 'yes', '1'].includes(String(value ?? '').toLowerCase()) }

export class M365DiscoveryService {
  constructor(private readonly repository = m365SnapshotRepository) {}
  async discover(options: M365DiscoveryOptions): Promise<M365DiscoveryResult> {
    const startedAt = new Date().toISOString()
    const snapshotId = `m365-snap-${options.tenantId}-${Date.now()}`
    await platformEventService.recordSystemEvent(options.tenantId, 'M365_DISCOVERY_STARTED', { entityType: 'CONNECTOR', entityId: 'm365', title: 'M365 discovery started', sourceSystem: 'm365-discovery-service', metadata: { snapshotId } }).catch(() => undefined)
    const readiness = options.readiness ?? await checkM365Readiness({ tenantId: options.tenantId })
    const blockers = [...readiness.blockers]
    const warnings = [...readiness.warnings]
    if (!readiness.readReady && !options.client) return this.finish(options.tenantId, snapshotId, 'FAILED', startedAt, warnings, blockers, null)
    const client = options.client ?? new M365GraphClient({ tenantId: options.tenantId })
    try {
      const orgs = await client.getOrganization().catch((error) => { warnings.push(`Organization read failed: ${String(error?.code ?? error?.message ?? error)}`); return [] as any[] })
      const skusRaw = await client.getSubscribedSkus()
      const page = await client.getUsersPage(options.perPage ?? 100)
      const usersRaw = (page as any).value ?? []
      const boundedUsers = usersRaw.slice(0, options.maxUsers ?? 100)
      const groups = ((await client.getGroupsPage(options.perPage ?? 100).catch(() => ({ value: [] }))) as any).value ?? []
      const skus: M365SubscribedSku[] = skusRaw.map((sku: any) => ({ skuId: String(sku.skuId), skuPartNumber: String(sku.skuPartNumber ?? sku.skuId), prepaidEnabled: Number(sku.prepaidUnits?.enabled ?? sku.prepaidEnabled ?? 0), consumedUnits: Number(sku.consumedUnits ?? 0), capabilityStatus: sku.capabilityStatus, appliesTo: sku.appliesTo }))
      const licenseAssignments: M365LicenseAssignment[] = []
      const users: M365User[] = []
      for (const user of boundedUsers) {
        const upn = String(user.userPrincipalName ?? user.mail ?? user.id)
        const assignedLicenses = (user.assignedLicenses ?? []).map((license: any) => String(license.skuId ?? license)).filter(Boolean)
        users.push({ id: String(user.id), tenantId: options.tenantId, userPrincipalName: upn, displayName: user.displayName, accountEnabled: user.accountEnabled !== false, userType: String(user.userType ?? 'Member'), department: user.department, jobTitle: user.jobTitle, usageLocation: user.usageLocation, createdDateTime: user.createdDateTime, signInActivity: user.signInActivity, assignedLicenses, assignedPlans: (user.assignedPlans ?? []).map((plan: any) => String(plan.servicePlanId ?? plan)), isAdminCandidate: /admin/i.test(upn) || /admin/i.test(String(user.displayName ?? '')), isServiceAccountCandidate: isService(upn, user.displayName), isSharedMailboxCandidate: isShared(upn, user.displayName), isNoReplyCandidate: isNoReply(upn), sourceSnapshotId: snapshotId })
        const details = await client.getUserLicenseDetails(String(user.id)).catch((error) => { warnings.push(`licenseDetails unavailable for bounded user ${String(user.id)}: ${String(error?.code ?? error?.message ?? error)}`); return [] as any[] })
        const detailRows = details.length ? details : assignedLicenses.map((skuId: string) => ({ skuId, skuPartNumber: skus.find((sku) => sku.skuId === skuId)?.skuPartNumber, assignmentType: 'UNKNOWN' }))
        for (const detail of detailRows) licenseAssignments.push({ id: `${snapshotId}:${user.id}:${detail.skuId}`, tenantId: options.tenantId, userId: String(user.id), skuId: String(detail.skuId), skuPartNumber: detail.skuPartNumber, assignmentType: detail.assignmentType ?? 'UNKNOWN', disabledPlans: (detail.servicePlans ?? []).filter((p: any) => p.provisioningStatus === 'Disabled').map((p: any) => String(p.servicePlanId)), sourceSnapshotId: snapshotId })
      }
      let activeRows: Record<string, string>[] = []
      let mailboxRows: Record<string, string>[] = []
      try { activeRows = parseCsv(await client.getOffice365ActiveUserDetail('D30')) } catch { warnings.push('Reports API active user detail unavailable') }
      try { mailboxRows = parseCsv(await client.getMailboxUsageDetail('D30')) } catch { warnings.push('Reports API mailbox usage detail unavailable') }
      const usageRecords: M365UsageRecord[] = activeRows.map((row, index) => ({ id: `${snapshotId}:active:${index}`, tenantId: options.tenantId, userPrincipalName: row['User Principal Name'] ?? row['UserPrincipalName'] ?? '', reportType: 'OFFICE365_ACTIVE_USER', lastActivityDate: row['Last Activity Date'] || row['Exchange Last Activity Date'] || row['Teams Last Activity Date'], exchangeActive: truthy(row['Exchange Active'] ?? row['Has Exchange License']), oneDriveActive: truthy(row['OneDrive Active'] ?? row['Has OneDrive License']), sharePointActive: truthy(row['SharePoint Active'] ?? row['Has SharePoint License']), teamsActive: truthy(row['Teams Active'] ?? row['Has Teams License']), outlookActive: truthy(row['Outlook Active'] ?? row['Exchange Active']), rawFields: row, sourceSnapshotId: snapshotId }))
      const mailboxes: M365Mailbox[] = mailboxRows.map((row, index) => ({ id: `${snapshotId}:mailbox:${index}`, tenantId: options.tenantId, userPrincipalName: row['User Principal Name'] ?? row['UserPrincipalName'] ?? '', recipientType: /shared/i.test(row['Recipient Type'] ?? '') ? 'SHARED' : 'USER', mailboxStorageUsed: Number.parseFloat(row['Storage Used (Byte)'] ?? row['Storage Used'] ?? '0') || undefined, itemCount: Number.parseInt(row['Item Count'] ?? '0', 10) || undefined, lastActivityDate: row['Last Activity Date'], sourceSnapshotId: snapshotId }))
      const status = warnings.some((w) => /Reports API/.test(w)) ? 'PARTIAL' : 'COMPLETED'
      const snapshot = { snapshotId, tenantId: options.tenantId, organizationId: orgs[0]?.id, displayName: orgs[0]?.displayName, capturedAt: new Date().toISOString(), source: 'MICROSOFT_GRAPH' as const }
      const result = this.result(options.tenantId, snapshotId, status, startedAt, warnings, blockers, users, skus, usageRecords, mailboxes, groups)
      this.repository.upsertSnapshot({ snapshot, users, licenseAssignments, skus, usageRecords, mailboxes, groups, discoveryRun: result } satisfies M365SnapshotBundle)
      await platformEventService.recordSystemEvent(options.tenantId, status === 'COMPLETED' ? 'M365_DISCOVERY_COMPLETED' : 'M365_DISCOVERY_PARTIAL', { entityType: 'CONNECTOR', entityId: 'm365', title: `M365 discovery ${status.toLowerCase()}`, sourceSystem: 'm365-discovery-service', metadata: { snapshotId, counts: result.counts, warnings } }).catch(() => undefined)
      return result
    } catch (error) {
      blockers.push(String((error as any)?.code ?? (error as Error).message ?? error))
      return this.finish(options.tenantId, snapshotId, 'FAILED', startedAt, warnings, blockers, null)
    }
  }
  private result(tenantId: string, snapshotId: string, status: M365DiscoveryResult['status'], startedAt: string, warnings: string[], blockers: string[], users: M365User[], skus: M365SubscribedSku[], usageRecords: M365UsageRecord[], mailboxes: M365Mailbox[], groups: any[]): M365DiscoveryResult { return { tenantId, snapshotId, status, counts: { users: users.length, enabledUsers: users.filter((u) => u.accountEnabled).length, disabledUsers: users.filter((u) => !u.accountEnabled).length, licensedUsers: users.filter((u) => u.assignedLicenses.length > 0).length, skus: skus.length, usageRecords: usageRecords.length, mailboxes: mailboxes.length, groups: groups.length }, warnings, blockers, startedAt, completedAt: new Date().toISOString() } }
  private async finish(tenantId: string, snapshotId: string, status: M365DiscoveryResult['status'], startedAt: string, warnings: string[], blockers: string[], bundle: M365SnapshotBundle | null) { const result = { tenantId, snapshotId, status, counts: { users: 0, enabledUsers: 0, disabledUsers: 0, licensedUsers: 0, skus: 0, usageRecords: 0, mailboxes: 0, groups: 0 }, warnings, blockers, startedAt, completedAt: new Date().toISOString() }; if (bundle) this.repository.upsertSnapshot(bundle); await platformEventService.recordSystemEvent(tenantId, 'M365_DISCOVERY_FAILED', { entityType: 'CONNECTOR', entityId: 'm365', title: 'M365 discovery failed', sourceSystem: 'm365-discovery-service', metadata: { snapshotId, blockers } }).catch(() => undefined); return result }
}

export const m365DiscoveryService = new M365DiscoveryService()
