import type { M365Playbook } from './m365-playbook-types'
import { candidate, latestSnapshotOrThrow, monthlySkuCost, skuPartFor } from './m365-playbook-utils'

const GENERIC_PREFIXES = ['info@', 'support@', 'sales@', 'accounts@']

export class SharedMailboxConversionPlaybook implements M365Playbook {
  playbookId = 'm365-shared-mailbox-conversion'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.filter((user) => user.assignedLicenses.length > 0 && (user.isSharedMailboxCandidate || GENERIC_PREFIXES.some((prefix) => user.userPrincipalName.toLowerCase().startsWith(prefix)))).map((user) => {
      const monthly = user.assignedLicenses.reduce((sum, skuId) => sum + monthlySkuCost(skuPartFor(snapshot, skuId)), 0)
      return candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'MAILBOX', title: `Convert licensed mailbox to shared mailbox: ${user.userPrincipalName}`, description: `${user.userPrincipalName} appears to be a generic or shared mailbox with paid licensing.`, monthly, confidenceBand: 'MEDIUM', evidence: [`user:${user.id}`, `mailbox:${user.userPrincipalName}`, ...user.assignedLicenses.map((skuId) => `license:${skuPartFor(snapshot, skuId)}`)], snapshotId, opportunityType: 'Shared Mailbox', recommendationKey: 'm365-shared-mailbox-conversion', costObjectKey: user.assignedLicenses.sort().join('|') })
    })
  }
}
