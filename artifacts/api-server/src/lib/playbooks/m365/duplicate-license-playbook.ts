import type { M365Playbook } from './m365-playbook-types'
import { lookupM365EntitlementRelationship } from './m365-entitlement-matrix'
import { candidate, costEstimateFor, DUPLICATE_ADDON_HINTS, latestSnapshotOrThrow, skuPartFor } from './m365-playbook-utils'

function hasE5(parts: string[]) { return parts.some((part) => part.includes('E5')) }
function redundantAddons(parts: string[]) { return parts.filter((part) => DUPLICATE_ADDON_HINTS.some((hint) => part.includes(hint)) || part.includes('POWER') || part.includes('DEFENDER')) }

export class DuplicateLicensePlaybook implements M365Playbook {
  playbookId = 'm365-duplicate-license-detection'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.flatMap((user) => {
      const parts = user.assignedLicenses.map((skuId) => skuPartFor(snapshot, skuId).toUpperCase())
      const parent = parts.find((part) => part.includes('E5'))
      const overlaps = hasE5(parts) ? redundantAddons(parts) : []
      if (!parent || overlaps.length === 0) return []
      const entitlementRelationships = overlaps.map((part) => lookupM365EntitlementRelationship(parent, part))
      const costEstimates = overlaps.map((part) => costEstimateFor(snapshot, part, part))
      const monthly = costEstimates.reduce((sum, cost) => sum + cost.monthlyUnitCost, 0)
      return [candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'LICENSE_ASSIGNMENT', title: `License overlap opportunity: ${user.userPrincipalName}`, description: `${user.userPrincipalName} has E5 plus potentially redundant add-ons: ${overlaps.join(', ')}.`, monthly, confidenceBand: 'MEDIUM', evidence: [`user:${user.id}`, ...parts.map((part) => `license:${part}`), ...entitlementRelationships.map((row) => `entitlement:${row.parentSku}:${row.includedSkuOrServicePlan}:${row.relationship}:${row.confidence}`), `overlap:${overlaps.join('|')}`], snapshotId, opportunityType: 'Duplicate License', recommendationKey: 'm365-duplicate-license', costObjectKey: overlaps.sort().join('|'), snapshot, costEstimates, entitlementRelationships })]
    })
  }
}
