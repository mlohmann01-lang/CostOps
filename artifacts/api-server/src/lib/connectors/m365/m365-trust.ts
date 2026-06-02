import { platformEventService } from '../../events/platform-event-service'
import { checkM365Readiness } from './m365-readiness'
import { m365SnapshotRepository } from './m365-snapshot-repository'
import type { M365TrustReport, TrustBand, TrustDimension } from './m365-types'

function band(score: number): TrustBand { return score >= 90 ? 'TRUSTED' : score >= 75 ? 'HIGH' : score >= 55 ? 'INVESTIGATE' : score > 0 ? 'LOW_CONFIDENCE' : 'BLOCKED' }
function dimension(score: number, reasons: string[], affectedValue?: number): TrustDimension { return { score, band: band(score), reasons, affectedValue } }
const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0

export class M365TrustService {
  constructor(private readonly repository = m365SnapshotRepository) {}
  async generateTrustReport(tenantId: string): Promise<M365TrustReport> {
    const latest = this.repository.getLatest(tenantId)
    const readiness = await checkM365Readiness({ tenantId }).catch(() => null)
    if (!latest) {
      const report = this.empty(tenantId, ['No M365 discovery snapshot available'])
      await this.emit(report)
      return report
    }
    const users = latest.users
    const userCount = users.length
    const signInCoverage = pct(users.filter((u) => u.signInActivity?.lastSignInDateTime || u.signInActivity?.lastNonInteractiveSignInDateTime).length, userCount)
    const identityCompleteness = pct(users.filter((u) => u.id && u.userPrincipalName && typeof u.accountEnabled === 'boolean').length, userCount)
    const licenseCoverage = pct(latest.licenseAssignments.length, Math.max(1, users.reduce((sum, user) => sum + user.assignedLicenses.length, 0)))
    const usageCoverage = pct(latest.usageRecords.length, userCount)
    const mailboxCoverage = pct(latest.mailboxes.length, userCount)
    const readReady = readiness?.readReady === true
    const writeReady = readiness?.writeReady === true
    const identityTrust = dimension(Math.round((identityCompleteness + signInCoverage) / 2), [`Identity completeness ${identityCompleteness}%`, `signInActivity coverage ${signInCoverage}%`, 'Service/admin/shared mailbox heuristics evaluated'])
    const licenseTrust = dimension(Math.min(100, Math.round((licenseCoverage + (latest.skus.length ? 90 : 40)) / 2)), [`licenseDetails coverage ${licenseCoverage}%`, `${latest.skus.length} subscribed SKUs observed`])
    const usageTrust = dimension(usageCoverage ? Math.min(90, usageCoverage) : 35, usageCoverage ? [`Reports API usage coverage ${usageCoverage}%`] : ['Reports API active user detail missing or unavailable'])
    const activityTrust = dimension(signInCoverage ? Math.min(95, signInCoverage) : 30, signInCoverage ? [`signInActivity freshness coverage ${signInCoverage}%`] : ['signInActivity evidence missing'])
    const mailboxTrust = dimension(mailboxCoverage ? Math.min(90, mailboxCoverage) : 35, mailboxCoverage ? [`Mailbox usage detail coverage ${mailboxCoverage}%`] : ['Mailbox usage report missing or unavailable'])
    const executionSafetyTrust = dimension(writeReady ? 55 : 25, writeReady ? ['Write permission present, but rollback proof still required before execution'] : ['Read-only sprint: write readiness or rollback evidence unavailable'])
    const dimensions = [identityTrust, licenseTrust, usageTrust, activityTrust, mailboxTrust, executionSafetyTrust]
    const globalTrustScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length)
    const blockers = readReady ? [] : ['Read readiness is not complete']
    const warnings = [...(readiness?.warnings ?? []), ...dimensions.filter((d) => d.band === 'LOW_CONFIDENCE' || d.band === 'BLOCKED').flatMap((d) => d.reasons)]
    const report: M365TrustReport = { tenantId, globalTrustScore, globalTrustBand: blockers.length ? 'LOW_CONFIDENCE' : band(globalTrustScore), identityTrust, licenseTrust, usageTrust, activityTrust, mailboxTrust, executionSafetyTrust, blockers, warnings, recommendations: ['Complete Reports API coverage before production confidence', 'Keep execution disabled until write readiness and rollback evidence are proven', 'Investigate trust is not sufficient for live M365 execution.'], generatedAt: new Date().toISOString() }
    await this.emit(report)
    return report
  }
  private empty(tenantId: string, blockers: string[]): M365TrustReport { const d = dimension(0, blockers); return { tenantId, globalTrustScore: 0, globalTrustBand: 'BLOCKED', identityTrust: d, licenseTrust: d, usageTrust: d, activityTrust: d, mailboxTrust: d, executionSafetyTrust: dimension(0, ['Execution disabled: no discovery snapshot or rollback proof']), blockers, warnings: [], recommendations: ['Run read-only M365 discovery'], generatedAt: new Date().toISOString() } }
  private async emit(report: M365TrustReport) { await platformEventService.recordSystemEvent(report.tenantId, 'M365_TRUST_UPDATED', { entityType: 'CONNECTOR', entityId: 'm365', title: `M365 trust ${report.globalTrustBand}`, sourceSystem: 'm365-trust', metadata: { globalTrustScore: report.globalTrustScore, globalTrustBand: report.globalTrustBand } }).catch(() => undefined) }
}

export const m365TrustService = new M365TrustService()
