import { platformEventService } from '../../events/platform-event-service'
import { checkM365Readiness } from './m365-readiness'
import { m365SnapshotRepository } from './m365-snapshot-repository'
import { m365TrustService } from './m365-trust'
import type { M365ConnectorHealth } from './m365-types'

function hoursSince(ts?: string) { if (!ts) return undefined; const ms = Date.now() - new Date(ts).getTime(); return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 36_000) / 100) : undefined }

export class M365HealthService {
  constructor(private readonly repository = m365SnapshotRepository) {}
  async getHealth(tenantId: string): Promise<M365ConnectorHealth> {
    const checkedAt = new Date().toISOString()
    const readiness = await checkM365Readiness({ tenantId }).catch((error) => ({ authState: 'TOKEN_FAILED' as const, readReady: false, writeReady: false, blockers: [String(error)], warnings: [], tokenAcquired: false, graphReachable: false, requiredReadPermissions: [], requiredWritePermissions: [], tenantId, checkedAt }))
    const latest = this.repository.getLatest(tenantId)
    const trust = await m365TrustService.generateTrustReport(tenantId)
    const freshnessAgeHours = hoursSince(latest?.snapshot.capturedAt)
    const stale = freshnessAgeHours == null ? true : freshnessAgeHours > 24
    const usageMissing = !latest || latest.usageRecords.length === 0
    const mailboxMissing = !latest || latest.mailboxes.length === 0
    let state: M365ConnectorHealth['state'] = 'HEALTHY'
    if (readiness.authState === 'MISSING_CONFIG') state = 'NOT_CONFIGURED'
    else if (readiness.authState === 'TOKEN_FAILED' || readiness.authState === 'GRAPH_UNREACHABLE') state = 'FAILED'
    else if (!readiness.readReady) state = 'FAILED'
    else if (!latest || stale || trust.globalTrustBand === 'LOW_CONFIDENCE') state = 'DEGRADED'
    else if (usageMissing || mailboxMissing) state = 'PARTIAL'
    const health: M365ConnectorHealth = { tenantId, state, dimensions: { auth: readiness.tokenAcquired ? 'READY' : readiness.authState, permissions: readiness.readReady ? 'READY' : 'BLOCKED', usersRead: latest && latest.users.length > 0 ? 'READY' : 'MISSING', licensesRead: latest && latest.licenseAssignments.length > 0 ? 'READY' : 'MISSING', usageReportsRead: usageMissing ? 'MISSING' : 'READY', mailboxReportsRead: mailboxMissing ? 'MISSING' : 'READY', freshness: !latest ? 'NO_SNAPSHOT' : stale ? 'STALE' : 'FRESH', rateLimitRisk: 'NORMAL' }, lastSuccessfulSyncAt: latest?.snapshot.capturedAt, lastFailedSyncAt: state === 'FAILED' ? checkedAt : undefined, lastError: readiness.blockers[0], freshnessAgeHours, warnings: [...readiness.warnings, ...(usageMissing ? ['Usage reports missing; trust degraded'] : []), ...(mailboxMissing ? ['Mailbox reports missing; trust degraded'] : [])], blockers: readiness.blockers, checkedAt }
    await platformEventService.recordSystemEvent(tenantId, 'M365_HEALTH_UPDATED', { entityType: 'CONNECTOR', entityId: 'm365', title: `M365 connector health ${state}`, sourceSystem: 'm365-health', metadata: { state, dimensions: health.dimensions } }).catch(() => undefined)
    return health
  }
}

export const m365HealthService = new M365HealthService()
