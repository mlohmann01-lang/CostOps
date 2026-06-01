import type { M365Playbook } from './m365-playbook-types'
import { candidate, latestSnapshotOrThrow, monthlySkuCost, SECURITY_SKU_HINTS, skuPartFor } from './m365-playbook-utils'

export class SecuritySkuRationalizationPlaybook implements M365Playbook {
  playbookId = 'm365-security-sku-rationalization'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.flatMap((user) => {
      const securityParts = user.assignedLicenses.map((skuId) => skuPartFor(snapshot, skuId).toUpperCase()).filter((part) => SECURITY_SKU_HINTS.some((hint) => part.includes(hint)))
      const hasSuite = user.assignedLicenses.map((skuId) => skuPartFor(snapshot, skuId).toUpperCase()).some((part) => part.includes('E5') || part.includes('EMS'))
      if (!hasSuite || securityParts.length < 1) return []
      const monthly = securityParts.reduce((sum, part) => sum + Math.max(5, monthlySkuCost(part)), 0)
      return [candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'SKU', title: `Security SKU rationalization: ${user.userPrincipalName}`, description: `${user.userPrincipalName} has suite licensing plus possible overlapping security add-ons: ${securityParts.join(', ')}.`, monthly, confidenceBand: 'MEDIUM', evidence: [`user:${user.id}`, `securitySkus:${securityParts.join('|')}`], snapshotId, opportunityType: 'Security SKU', recommendationKey: 'm365-security-sku-rationalization', costObjectKey: securityParts.sort().join('|') })]
    })
  }
}
