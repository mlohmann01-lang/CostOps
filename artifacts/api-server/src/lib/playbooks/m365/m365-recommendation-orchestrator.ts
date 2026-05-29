import { createHash } from 'node:crypto'
import { buildGovernedRecommendation } from '../../recommendations/recommendation-builder'
import type { GovernedRecommendationObject } from '../../recommendations/types'
import type { DiscoveryLifecycleState } from '../../discovery-intelligence/types'
import { buildM365InactiveUserReclaimGovernedRecommendation } from '../m365-inactive-user-reclaim/governed-recommendation'
import { buildM365RightsizingGovernedRecommendation } from '../m365-rightsizing/governed-recommendation'
import { buildM365CopilotUtilisationGovernedRecommendation } from '../m365-copilot-utilisation/governed-recommendation'
import { buildM365AddonReclamationGovernedRecommendation } from '../m365-addon-reclamation/governed-recommendation'
import { calculateMonthlyDelta, getM365MonthlyPrice } from './m365-pricing'

/**
 * Phase 2 M365 live bridge notes:
 * - Current live M365 users are loaded from `m365_users` via `m365UsersTable`.
 * - That table stores normalized user, assigned license, last-login, connector health, freshness and ingestion run metadata.
 * - Read-only Graph sync services live under `lib/connectors/m365/*read-only*sync*`; `/api/playbooks/m365/generate-recommendations` is the missing bridge from ingested rows to governed recommendations.
 * - This orchestrator intentionally reads already-ingested data only; it does not mutate connectors, create dry-runs, or create execution requests.
 */
export type M365NormalizedRecommendationUser = {
  tenantId: string
  userId: string
  userPrincipalName: string
  displayName?: string | null
  accountEnabled?: boolean | string
  assignedLicenses?: string[]
  lastLoginDaysAgo?: number | null
  lifecycleState?: DiscoveryLifecycleState
  confidenceScore?: number
  sourceReferences?: string[]
  graphNodeIds?: string[]
  graphEdgeIds?: string[]
  connectorHealth?: string
  dataFreshnessScore?: number
  ingestionRunId?: string
  usageSignals?: string[]
  copilotUsageLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  addonUsageLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  personaFit?: 'E1' | 'F3' | 'WEB_ONLY' | 'E3' | 'E5' | 'UNKNOWN'
  isAdmin?: boolean
  isServiceAccount?: boolean
  isSharedMailbox?: boolean
  isVip?: boolean
  legalHold?: boolean
  complianceSensitive?: boolean
  exclusions?: string[]
}

export type M365RecommendationOrchestrationResult = {
  recommendations: GovernedRecommendationObject[]
  scannedUsers: number
  skipped: number
  errors: Array<{ userId?: string; reason: string }>
}

function bool(value: unknown) {
  if (typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

function deterministicId(tenantId: string, playbookId: string, userId: string, action: string, sku: string) {
  const hash = createHash('sha256').update(`${tenantId}|${playbookId}|${userId}|${action}|${sku}`).digest('hex').slice(0, 16)
  return `${tenantId}:${playbookId}:${userId}:${sku}:${hash}`
}

function trustedLifecycle(user: M365NormalizedRecommendationUser): DiscoveryLifecycleState {
  if (user.lifecycleState) return user.lifecycleState
  if (String(user.connectorHealth ?? 'HEALTHY').toUpperCase() !== 'HEALTHY') return 'STALE'
  if (Number(user.dataFreshnessScore ?? 1) < 0.5) return 'STALE'
  return 'TRUSTED'
}

function withId(rec: GovernedRecommendationObject | null, tenantId: string, playbookId: string, userId: string, action: string, sku: string) {
  return rec ? { ...rec, recommendationId: deterministicId(tenantId, playbookId, userId, action, sku) } : null
}

function blockedRecommendation(input: { tenantId: string; user: M365NormalizedRecommendationUser; playbookId: string; actionType: string; sku: string; monthlySavings: number; reasons: string[] }): GovernedRecommendationObject {
  return {
    ...buildGovernedRecommendation({
      recommendationId: deterministicId(input.tenantId, input.playbookId, input.user.userId, input.actionType, input.sku),
      tenantId: input.tenantId,
      playbookId: input.playbookId,
      targetEntityId: input.user.userId,
      targetEntityType: 'User',
      graphNodeIds: input.user.graphNodeIds ?? [],
      graphEdgeIds: input.user.graphEdgeIds ?? [],
      discoveryLifecycleState: input.user.lifecycleState ?? 'STALE',
      confidenceScore: input.user.confidenceScore ?? 0.5,
      reliabilityBand: 'LOW',
      projectedMonthlySavings: input.monthlySavings,
      projectedAnnualSavings: input.monthlySavings * 12,
      savingsConfidence: 'LOW',
      actionType: input.actionType,
      actionRiskClass: 'B',
      evidencePointers: [`m365:user:${input.user.userId}`, `m365:sku:${input.sku}`, ...(input.user.sourceReferences ?? [])],
      hasApproval: false,
    }),
    executionReadiness: 'BLOCKED',
    recommendationState: 'BLOCKED',
    blockedReasons: input.reasons,
  }
}

export function generateM365GovernedRecommendations(input: { tenantId: string; users: M365NormalizedRecommendationUser[] }): M365RecommendationOrchestrationResult {
  const recommendations: GovernedRecommendationObject[] = []
  const errors: Array<{ userId?: string; reason: string }> = []
  let skipped = 0
  if (!input.tenantId) return { recommendations, scannedUsers: 0, skipped: input.users.length, errors: [{ reason: 'tenantId required' }] }

  for (const user of input.users) {
    try {
      if (!user.tenantId || user.tenantId !== input.tenantId) { skipped++; errors.push({ userId: user.userId, reason: 'tenant mismatch or missing tenantId' }); continue }
      const sourceReferences = user.sourceReferences ?? []
      if (sourceReferences.length === 0) { skipped++; errors.push({ userId: user.userId, reason: 'missing source/evidence pointers' }); continue }
      const assigned = user.assignedLicenses ?? []
      if (assigned.length === 0) { skipped++; continue }
      if ((user.exclusions ?? []).length > 0) { skipped++; continue }

      const lifecycleState = trustedLifecycle(user)
      const accountEnabled = bool(user.accountEnabled ?? true)
      const days = Number(user.lastLoginDaysAgo ?? 0)
      const confidenceScore = user.confidenceScore ?? 0.82
      const source = [...sourceReferences, `ingestion:${user.ingestionRunId ?? 'unknown'}`]
      const common = { isAdmin: user.isAdmin, isServiceAccount: user.isServiceAccount, isSharedMailbox: user.isSharedMailbox, isVip: user.isVip, legalHold: user.legalHold, complianceSensitive: user.complianceSensitive }

      const reclaimSku = assigned[0]
      const reclaimSavings = assigned.reduce((sum, sku) => sum + getM365MonthlyPrice(sku), 0)
      if (!accountEnabled || days > 90) {
        const playbookId = accountEnabled ? 'M365_INACTIVE_LICENSED_USER_RECLAIM' as const : 'M365_DISABLED_LICENSED_USER_RECLAIM' as const
        if (lifecycleState !== 'TRUSTED') recommendations.push(blockedRecommendation({ tenantId: input.tenantId, user, playbookId, actionType: 'REMOVE_LICENSE', sku: reclaimSku, monthlySavings: reclaimSavings, reasons: ['DISCOVERY_NOT_TRUSTED'] }))
        else {
          const out = buildM365InactiveUserReclaimGovernedRecommendation({ tenantId: input.tenantId, playbookId, userId: user.userId, userPrincipalName: user.userPrincipalName, accountEnabled, inactivityDays: days, assignedLicenses: assigned, projectedMonthlySavings: reclaimSavings, graphNodeIds: user.graphNodeIds ?? [], graphEdgeIds: user.graphEdgeIds ?? [], discoveryLifecycleState: lifecycleState, confidenceScore, reliabilityBand: confidenceScore >= 0.85 ? 'HIGH' : 'MEDIUM', hasUsageData: true, hasTrustedIdentityMatch: true, ...common })
          const rec = withId(out.recommendation, input.tenantId, playbookId, user.userId, 'REMOVE_LICENSE', reclaimSku)
          if (rec) recommendations.push(rec); else skipped++
        }
      }

      const hasE5 = assigned.some((sku) => /E5/i.test(sku))
      const proposedSku = hasE5 ? 'E3' : assigned.some((sku) => /E3/i.test(sku)) ? 'E1' : undefined
      const rightsizeDelta = proposedSku ? calculateMonthlyDelta(hasE5 ? 'E5' : 'E3', proposedSku) : 0
      const usageSignals = user.usageSignals?.length ? user.usageSignals : days > 45 ? ['low-usage-from-last-login'] : []
      if (hasE5 && rightsizeDelta > 0 && usageSignals.length > 0) {
        if (lifecycleState !== 'TRUSTED') recommendations.push(blockedRecommendation({ tenantId: input.tenantId, user, playbookId: 'M365_RIGHTSIZE_LICENSE_V1', actionType: 'RIGHTSIZE_LICENSE', sku: 'E5_TO_E3', monthlySavings: rightsizeDelta, reasons: ['DISCOVERY_NOT_TRUSTED'] }))
        else {
          const out = buildM365RightsizingGovernedRecommendation({ tenantId: input.tenantId, userId: user.userId, userPrincipalName: user.userPrincipalName, currentSku: 'M365_E5', proposedSku: 'M365_E3', usageSignals, personaFit: user.personaFit ?? 'E3', confidenceScore, sourceReferences: source, projectedMonthlySavings: rightsizeDelta, lifecycleState, ...common })
          const rec = withId(out.recommendation, input.tenantId, 'M365_RIGHTSIZE_LICENSE_V1', user.userId, 'RIGHTSIZE_LICENSE', 'E5_TO_E3')
          if (rec) recommendations.push(rec); else skipped++
        }
      }

      const copilotSku = assigned.find((sku) => /COPILOT/i.test(sku))
      if (copilotSku && (user.copilotUsageLevel === 'NONE' || days > 30)) {
        const monthly = getM365MonthlyPrice('COPILOT')
        const out = lifecycleState !== 'TRUSTED' ? { recommendation: blockedRecommendation({ tenantId: input.tenantId, user, playbookId: 'M365_COPILOT_UTILISATION_V1', actionType: 'RECLAIM_COPILOT_LICENSE', sku: copilotSku, monthlySavings: monthly, reasons: ['DISCOVERY_NOT_TRUSTED'] }) } : buildM365CopilotUtilisationGovernedRecommendation({ tenantId: input.tenantId, userId: user.userId, userPrincipalName: user.userPrincipalName, assignedCopilotSku: copilotSku, copilotUsageLevel: user.copilotUsageLevel ?? 'NONE', copilotUsageSignals: ['copilot-low-or-no-usage'], personaFit: 'WEAK', sourceReferences: source, projectedMonthlySavingsOrValue: monthly, lifecycleState, accountEnabled, isInactive: days > 90, ...common })
        const rec = withId(out.recommendation, input.tenantId, 'M365_COPILOT_UTILISATION_V1', user.userId, 'RECLAIM_COPILOT_LICENSE', copilotSku)
        if (rec) recommendations.push(rec); else skipped++
      }

      const addonSku = assigned.find((sku) => /ADDON|ADD-ON|VISIO|PROJECT|POWER|PHONE/i.test(sku))
      if (addonSku && (user.addonUsageLevel === 'NONE' || days > 30)) {
        const monthly = getM365MonthlyPrice(addonSku)
        const out = lifecycleState !== 'TRUSTED' ? { recommendation: blockedRecommendation({ tenantId: input.tenantId, user, playbookId: 'M365_ADDON_RECLAMATION_V1', actionType: 'RECLAIM_ADDON_LICENSE', sku: addonSku, monthlySavings: monthly, reasons: ['DISCOVERY_NOT_TRUSTED'] }) } : buildM365AddonReclamationGovernedRecommendation({ tenantId: input.tenantId, userId: user.userId, userPrincipalName: user.userPrincipalName, addonSku, baseSku: assigned.find((sku) => /E[135]|F3/i.test(sku)), assignmentState: 'ASSIGNED', usageLevel: user.addonUsageLevel ?? 'NONE', usageSignals: ['addon-low-or-no-usage'], personaFit: 'WEAK', sourceReferences: source, projectedMonthlySavingsOrValue: monthly, lifecycleState, accountEnabled, isInactive: days > 90, ...common })
        const rec = withId(out.recommendation, input.tenantId, 'M365_ADDON_RECLAMATION_V1', user.userId, 'RECLAIM_ADDON_LICENSE', addonSku)
        if (rec) recommendations.push(rec); else skipped++
      }
    } catch (error) {
      skipped++
      errors.push({ userId: user.userId, reason: (error as Error).message })
    }
  }

  return { recommendations, scannedUsers: input.users.length, skipped, errors }
}
