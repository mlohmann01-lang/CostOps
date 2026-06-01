import { calculateAnnualizedSavings, getM365MonthlyPrice } from './m365-pricing'
import type { M365OpportunityCandidate, M365ConfidenceBand, M365EntityType } from './m365-playbook-types'
import { m365SnapshotRepository } from '../../connectors/m365/m365-snapshot-repository'
import type { M365User } from '../../connectors/m365/m365-types'

export const LOW_CONFIDENCE_COST = 10
export const COPILOT_SKU_HINTS = ['COPILOT']
export const SECURITY_SKU_HINTS = ['DEFENDER', 'ENTRA', 'AAD_PREMIUM', 'EMS', 'IDENTITY']
export const DUPLICATE_ADDON_HINTS = ['POWER_BI_PRO', 'PBI', 'DEFENDER', 'ENTRA', 'AUDIO', 'PHONE']

export function latestSnapshotOrThrow(tenantId: string, snapshotId: string) {
  const latest = m365SnapshotRepository.getLatest(tenantId)
  if (!latest || latest.snapshot.snapshotId !== snapshotId) throw new Error('M365_SNAPSHOT_NOT_FOUND')
  return latest
}

export function daysSince(value?: string) { if (!value) return 9999; const ms = Date.now() - new Date(value).getTime(); return Number.isFinite(ms) ? Math.floor(ms / 86400000) : 9999 }
export function lastActivityFor(user: M365User) { return user.signInActivity?.lastSignInDateTime ?? user.signInActivity?.lastNonInteractiveSignInDateTime }
export function isProtectedUser(user: M365User) { return Boolean(user.isAdminCandidate || user.isServiceAccountCandidate || user.isSharedMailboxCandidate || user.isNoReplyCandidate) }
export function skuPartFor(snapshot: ReturnType<typeof latestSnapshotOrThrow>, skuId: string) { return snapshot.skus.find((sku) => sku.skuId === skuId)?.skuPartNumber ?? skuId }
export function monthlySkuCost(skuPartNumber?: string) { return getM365MonthlyPrice(skuPartNumber) || LOW_CONFIDENCE_COST }
export function confidenceFor(hasCost: boolean, evidenceCount: number): M365ConfidenceBand { return hasCost && evidenceCount >= 3 ? 'HIGH' : hasCost ? 'MEDIUM' : 'LOW' }
export function confidenceScore(band: M365ConfidenceBand) { return band === 'HIGH' ? 88 : band === 'MEDIUM' ? 74 : 48 }
export function trustScore(band: M365ConfidenceBand, blockers: string[] = []) { if (blockers.length) return 45; return band === 'HIGH' ? 84 : band === 'MEDIUM' ? 72 : 52 }
export function hasSku(user: M365User, snapshot: ReturnType<typeof latestSnapshotOrThrow>, hints: string[]) { return user.assignedLicenses.some((skuId) => hints.some((hint) => skuPartFor(snapshot, skuId).toUpperCase().includes(hint))) }

export function candidate(input: { playbookId: string; entityId: string; entityType: M365EntityType; title: string; description: string; monthly: number; confidenceBand: M365ConfidenceBand; evidence: string[]; blockers?: string[]; trustRequirements?: string[]; snapshotId: string; opportunityType: string; affectedUsers?: number; recommendationKey?: string; costObjectKey?: string }): M365OpportunityCandidate {
  const blockers = input.blockers ?? []
  const annual = calculateAnnualizedSavings(input.monthly)
  return {
    playbookId: input.playbookId,
    entityId: input.entityId,
    entityType: input.entityType,
    projectedMonthlySavings: input.monthly,
    projectedAnnualSavings: annual,
    confidenceBand: input.confidenceBand,
    evidence: input.evidence,
    blockers,
    trustRequirements: input.trustRequirements ?? ['M365 discovery snapshot', 'M365 trust report', 'Opportunity Factory persistence'],
    opportunityPayload: {
      id: `opp-m365-${input.playbookId}-${input.entityId}`.replace(/[^a-zA-Z0-9:_-]/g, '-'),
      source: 'M365_PLAYBOOK',
      recommendationSource: 'M365_PLAYBOOK',
      sourceReferenceId: `${input.playbookId}:${input.entityId}`,
      title: input.title,
      description: input.description,
      domain: 'M365',
      projectedMonthlySavings: input.monthly,
      projectedAnnualSavings: annual,
      readiness: blockers.length ? 'BLOCKED' : 'APPROVAL_REQUIRED',
      confidenceScore: confidenceScore(input.confidenceBand),
      trustScore: trustScore(input.confidenceBand, blockers),
      evidence: [`snapshot:${input.snapshotId}`, ...input.evidence],
      reasons: [input.opportunityType, ...blockers],
      entityKey: `m365:${input.entityType}:${input.entityId}`,
      recommendationKey: input.recommendationKey ?? `${input.playbookId}:${input.entityType}`,
      costObjectKey: input.costObjectKey ?? 'M365_LICENSE',
      affectedUsers: input.affectedUsers ?? 1,
      opportunityType: input.opportunityType,
      playbookId: input.playbookId,
      snapshotId: input.snapshotId,
    },
  }
}
