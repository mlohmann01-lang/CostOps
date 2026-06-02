import type { M365Playbook } from './m365-playbook-types'
import { candidate, costEstimateFor, latestSnapshotOrThrow, skuPartFor } from './m365-playbook-utils'

const GENERIC_PREFIXES = ['info@', 'support@', 'sales@', 'accounts@']

export class SharedMailboxConversionPlaybook implements M365Playbook {
  playbookId = 'm365-shared-mailbox-conversion'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.users.filter((user) => user.assignedLicenses.length > 0 && (user.isSharedMailboxCandidate || GENERIC_PREFIXES.some((prefix) => user.userPrincipalName.toLowerCase().startsWith(prefix)))).map((user) => {
      const costEstimates = user.assignedLicenses.map((skuId) => costEstimateFor(snapshot, skuId))
      const monthly = costEstimates.reduce((sum, cost) => sum + cost.monthlyUnitCost, 0)
      const mailbox = snapshot.mailboxes.find((m) => m.userPrincipalName.toLowerCase() === user.userPrincipalName.toLowerCase())
      return candidate({ playbookId: this.playbookId, entityId: user.id, entityType: 'MAILBOX', title: `Convert licensed mailbox to shared mailbox: ${user.userPrincipalName}`, description: `${user.userPrincipalName} appears to be a generic or shared mailbox with paid licensing.`, monthly, confidenceBand: 'MEDIUM', evidence: [`user:${user.id}`, `mailbox:${user.userPrincipalName}`, `recipientType:${mailbox?.recipientType ?? 'missing'}`, `ownerReview:required`, `mailboxHeuristic:${user.isSharedMailboxCandidate || GENERIC_PREFIXES.some((prefix) => user.userPrincipalName.toLowerCase().startsWith(prefix)) ? 'strong' : 'weak'}`, ...user.assignedLicenses.map((skuId) => `license:${skuPartFor(snapshot, skuId)}`)], snapshotId, opportunityType: 'Shared Mailbox', recommendationKey: 'm365-shared-mailbox-conversion', costObjectKey: user.assignedLicenses.sort().join('|'), snapshot, costEstimates })
    })
  }
}
