import type { M365Playbook } from './m365-playbook-types'
import { candidate, costEstimateFor, daysSince, lastActivityFor, latestSnapshotOrThrow } from './m365-playbook-utils'

export class LicensePoolRecoveryPlaybook implements M365Playbook {
  playbookId = 'm365-license-pool-recovery'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.skus.flatMap((sku) => {
      const inactiveAssigned = snapshot.users.filter((user) => user.assignedLicenses.includes(sku.skuId) && daysSince(lastActivityFor(user)) > 90)
      const unusedCapacity = Math.max(0, Number(sku.prepaidEnabled ?? 0) - Number(sku.consumedUnits ?? 0))
      const recoverable = inactiveAssigned.length + unusedCapacity
      if (recoverable <= 0) return []
      const costEstimates = [costEstimateFor(snapshot, sku.skuId, sku.skuPartNumber)]
      const monthly = recoverable * costEstimates[0].monthlyUnitCost
      return [candidate({ playbookId: this.playbookId, entityId: sku.skuId, entityType: 'LICENSE_POOL', title: `Recover ${sku.skuPartNumber} license pool`, description: `${recoverable} ${sku.skuPartNumber} licenses are unused or assigned to inactive users.`, monthly, confidenceBand: sku.skuPartNumber ? 'HIGH' : 'LOW', evidence: [`sku:${sku.skuId}`, `unusedCapacity:${unusedCapacity}`, `inactiveAssigned:${inactiveAssigned.length}`, ...inactiveAssigned.map((u) => `user:${u.id}`)], snapshotId, opportunityType: 'License Pool', affectedUsers: recoverable, recommendationKey: 'm365-license-pool-recovery', costObjectKey: sku.skuPartNumber, snapshot, costEstimates })]
    })
  }
}
