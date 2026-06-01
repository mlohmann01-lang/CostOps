import type { M365Playbook } from './m365-playbook-types'
import { candidate, confidenceFor, COPILOT_SKU_HINTS, daysSince, hasSku, lastActivityFor, latestSnapshotOrThrow, monthlySkuCost } from './m365-playbook-utils'

function usageBand(records: any[], upn: string, inactive: boolean) {
  const row = records.find((record) => String(record.userPrincipalName).toLowerCase() === upn.toLowerCase())
  if (inactive) return 'NO_USAGE'
  if (!row) return 'NO_USAGE'
  const activeSignals = [row.teamsActive, row.outlookActive, row.exchangeActive, row.oneDriveActive, row.sharePointActive].filter(Boolean).length
  return activeSignals >= 4 ? 'HIGH_USAGE' : activeSignals >= 2 ? 'MEDIUM_USAGE' : activeSignals === 1 ? 'LOW_USAGE' : 'NO_USAGE'
}

export class CopilotRightsizingPlaybook implements M365Playbook {
  playbookId = 'm365-copilot-rightsizing'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.filter((user) => hasSku(user, snapshot, COPILOT_SKU_HINTS)).flatMap((user) => {
      const inactive = daysSince(lastActivityFor(user)) > 90
      const band = usageBand(snapshot.usageRecords, user.userPrincipalName, inactive)
      if (band === 'HIGH_USAGE') return []
      const action = band === 'NO_USAGE' ? 'Remove' : band === 'LOW_USAGE' ? 'Reassign' : 'Review'
      const monthly = band === 'MEDIUM_USAGE' ? Math.round(monthlySkuCost('COPILOT') * 0.4) : monthlySkuCost('COPILOT')
      const evidence = [`user:${user.id}`, `copilotUsage:${band}`, `lastSignIn:${lastActivityFor(user) ?? 'missing'}`, ...user.assignedLicenses.map((skuId) => `license:${skuId}`)]
      return [candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'COPILOT_USER', title: `Copilot ${action} opportunity: ${user.userPrincipalName}`, description: `${user.userPrincipalName} is assigned Copilot with ${band.replace('_', ' ').toLowerCase()} evidence.`, monthly, confidenceBand: confidenceFor(true, evidence.length), evidence, snapshotId, opportunityType: `Copilot ${band}`, affectedUsers: 1, recommendationKey: `m365-copilot-${band.toLowerCase()}`, costObjectKey: 'COPILOT' })]
    })
  }
}
