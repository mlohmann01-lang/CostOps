import type { M365Playbook } from './m365-playbook-types'
import { lookupM365EntitlementRelationship } from './m365-entitlement-matrix'
import { candidate, costEstimateFor, latestSnapshotOrThrow, SECURITY_SKU_HINTS, skuPartFor } from './m365-playbook-utils'

export class SecuritySkuRationalizationPlaybook implements M365Playbook {
  playbookId = 'm365-security-sku-rationalization'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.flatMap((user) => {
      const parts = user.assignedLicenses.map((skuId) => skuPartFor(snapshot, skuId).toUpperCase())
      const securityParts = parts.filter((part) => SECURITY_SKU_HINTS.some((hint) => part.includes(hint)))
      const suite = parts.find((part) => part.includes('E5') || part.includes('EMS'))
      if (!suite || securityParts.length < 1) return []
      const entitlementRelationships = securityParts.map((part) => lookupM365EntitlementRelationship(suite, part))
      const costEstimates = securityParts.map((part) => costEstimateFor(snapshot, part, part))
      const monthly = costEstimates.reduce((sum, cost) => sum + cost.monthlyUnitCost, 0)
      return [candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'SKU', title: `Security SKU rationalization: ${user.userPrincipalName}`, description: `${user.userPrincipalName} has suite licensing plus possible overlapping security add-ons: ${securityParts.join(', ')}.`, monthly, confidenceBand: 'MEDIUM', evidence: [`user:${user.id}`, `securitySkus:${securityParts.join('|')}`, `securityReviewRequired:true`, ...entitlementRelationships.map((row) => `entitlement:${row.parentSku}:${row.includedSkuOrServicePlan}:${row.relationship}:${row.confidence}`)], snapshotId, opportunityType: 'Security SKU', recommendationKey: 'm365-security-sku-rationalization', costObjectKey: securityParts.sort().join('|'), snapshot, costEstimates, entitlementRelationships })]
    })
  }
}
