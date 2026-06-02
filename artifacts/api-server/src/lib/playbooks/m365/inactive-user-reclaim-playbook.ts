import type { M365Playbook } from './m365-playbook-types'
import { candidate, confidenceFor, costEstimateFor, daysSince, isProtectedUser, lastActivityFor, latestSnapshotOrThrow, skuPartFor } from './m365-playbook-utils'

export class InactiveUserReclaimPlaybook implements M365Playbook {
  playbookId = 'm365-inactive-user-reclaim'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.filter((user) => user.accountEnabled && user.assignedLicenses.length > 0 && daysSince(lastActivityFor(user)) > 90).map((user) => {
      const costEstimates = user.assignedLicenses.map((skuId) => costEstimateFor(snapshot, skuId))
      const monthly = costEstimates.reduce((sum, cost) => sum + cost.monthlyUnitCost, 0)
      const hasCost = costEstimates.some((cost) => cost.monthlyUnitCost > 0)
      const assignmentTypes = user.assignedLicenses.map((skuId) => snapshot.licenseAssignments.find((assignment) => assignment.userId === user.id && assignment.skuId === skuId)?.assignmentType ?? 'UNKNOWN')
      const evidence = [`user:${user.id}`, `lastSignIn:${lastActivityFor(user) ?? 'missing'}`, `protectedSignalsEvaluated:${isProtectedUser(user) ? 'protected' : 'clear'}`, ...assignmentTypes.map((type) => `assignmentType:${type}`), ...user.assignedLicenses.map((skuId) => `license:${skuPartFor(snapshot, skuId)}`)]
      const blockers = isProtectedUser(user) ? ['Protected account signal present'] : []
      return candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'USER', title: `Inactive M365 user reclaim: ${user.userPrincipalName}`, description: `${user.userPrincipalName} is licensed and has no activity for more than 90 days.`, monthly, confidenceBand: confidenceFor(hasCost, evidence.length), evidence, blockers, snapshotId, opportunityType: 'Inactive User', recommendationKey: 'm365-inactive-user-reclaim', costObjectKey: user.assignedLicenses.sort().join('|'), snapshot, costEstimates })
    })
  }
}
