import type { M365Playbook } from './m365-playbook-types'
import { candidate, confidenceFor, daysSince, isProtectedUser, lastActivityFor, latestSnapshotOrThrow, monthlySkuCost, skuPartFor } from './m365-playbook-utils'

export class InactiveUserReclaimPlaybook implements M365Playbook {
  playbookId = 'm365-inactive-user-reclaim'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.filter((user) => user.accountEnabled && user.assignedLicenses.length > 0 && daysSince(lastActivityFor(user)) > 90 && !isProtectedUser(user)).map((user) => {
      const costs = user.assignedLicenses.map((skuId) => monthlySkuCost(skuPartFor(snapshot, skuId)))
      const monthly = costs.reduce((sum, cost) => sum + cost, 0)
      const hasCost = costs.some((cost) => cost > 10)
      const evidence = [`user:${user.id}`, `lastSignIn:${lastActivityFor(user) ?? 'missing'}`, ...user.assignedLicenses.map((skuId) => `license:${skuPartFor(snapshot, skuId)}`)]
      return candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'USER', title: `Inactive M365 user reclaim: ${user.userPrincipalName}`, description: `${user.userPrincipalName} is licensed and has no activity for more than 90 days.`, monthly, confidenceBand: confidenceFor(hasCost, evidence.length), evidence, snapshotId, opportunityType: 'Inactive User', recommendationKey: 'm365-inactive-user-reclaim', costObjectKey: user.assignedLicenses.sort().join('|') })
    })
  }
}
