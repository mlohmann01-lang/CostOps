import type { M365TrustReport, TrustDimension } from '../lib/connectors/m365/m365-types'
import type { M365SnapshotBundle } from '../lib/connectors/m365/m365-snapshot-repository'

export function trustReport(band: TrustDimension['band'] = 'HIGH'): M365TrustReport {
  const score = band === 'TRUSTED' ? 92 : band === 'HIGH' ? 82 : band === 'INVESTIGATE' ? 60 : 30
  const dim: TrustDimension = { band, score, reasons: [band] }
  return { tenantId: 'tenant-exec', globalTrustScore: score, globalTrustBand: band, identityTrust: dim, licenseTrust: dim, usageTrust: dim, activityTrust: dim, mailboxTrust: dim, executionSafetyTrust: dim, blockers: [], warnings: [], recommendations: [], generatedAt: new Date().toISOString() }
}

export function inactiveReclaimOpportunity(overrides: Record<string, any> = {}) {
  return { id: 'opp-m365-inactive', playbookId: 'm365-inactive-user-reclaim', executionType: 'INACTIVE_USER_LICENSE_RECLAIM', mutationType: 'REMOVE_M365_LICENSE', source: 'M365_PLAYBOOK', projectedMonthlySavings: 57, projectedAnnualSavings: 684, economicAssessment: { executionSafety: 'SAFE_TO_RECOMMEND', productionReadiness: 'READY_FOR_APPROVAL', falsePositiveRisk: 'LOW', evidenceQuality: 'STRONG', savingsConfidence: 'HIGH', requiredHumanReview: false, allowedNextStep: 'SUBMIT_FOR_APPROVAL', savingsReasons: [], safetyReasons: [], evidenceReasons: [], blockers: [] }, ...overrides }
}

export function executionSnapshot(overrides: Partial<M365SnapshotBundle> = {}): M365SnapshotBundle {
  const tenantId = 'tenant-exec'
  const snapshotId = 'snap-exec'
  return { snapshot: { snapshotId, tenantId, capturedAt: new Date().toISOString(), source: 'MICROSOFT_GRAPH' }, users: [{ id: 'u1', tenantId, userPrincipalName: 'inactive@example.com', accountEnabled: true, userType: 'Member', assignedLicenses: ['sku-e5'], signInActivity: { lastSignInDateTime: '2026-01-01T00:00:00Z' }, sourceSnapshotId: snapshotId }], licenseAssignments: [{ id: 'la1', tenantId, userId: 'u1', skuId: 'sku-e5', skuPartNumber: 'SPE_E5', assignmentType: 'DIRECT', sourceSnapshotId: snapshotId }], skus: [{ skuId: 'sku-e5', skuPartNumber: 'SPE_E5', prepaidEnabled: 1, consumedUnits: 1 }], usageRecords: [], mailboxes: [], groups: [], discoveryRun: { tenantId, snapshotId, status: 'COMPLETED', counts: { users: 1, enabledUsers: 1, disabledUsers: 0, licensedUsers: 1, skus: 1, usageRecords: 0, mailboxes: 0, groups: 0 }, warnings: [], blockers: [], startedAt: new Date().toISOString(), completedAt: new Date().toISOString() }, ...overrides }
}
