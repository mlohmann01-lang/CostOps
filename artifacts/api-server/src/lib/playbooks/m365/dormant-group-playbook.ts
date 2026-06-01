import type { M365Playbook } from './m365-playbook-types'
import { candidate, latestSnapshotOrThrow } from './m365-playbook-utils'

export class DormantGroupPlaybook implements M365Playbook {
  playbookId = 'm365-dormant-group-cleanup'
  async evaluate(tenantId: string, snapshotId: string) {
    const snapshot = latestSnapshotOrThrow(tenantId, snapshotId)
    return snapshot.groups.filter((group: any) => !group.ownerId && !group.owners?.length && (group.lastActivityDate == null || /stale|dormant|legacy/i.test(String(group.displayName ?? '')))).map((group: any) => candidate({ playbookId: this.playbookId, entityId: String(group.id), entityType: 'GROUP', title: `Dormant group cleanup: ${group.displayName ?? group.id}`, description: `${group.displayName ?? group.id} has no owner or stale activity evidence and should be reviewed.`, monthly: 0, confidenceBand: 'LOW', evidence: [`group:${group.id}`, `owner:${group.ownerId ?? 'missing'}`, `lastActivity:${group.lastActivityDate ?? 'missing'}`], blockers: ['Manual review required before cleanup'], snapshotId, opportunityType: 'Dormant Group', recommendationKey: 'm365-dormant-group-cleanup', costObjectKey: 'M365_GROUP_GOVERNANCE' }))
  }
}
