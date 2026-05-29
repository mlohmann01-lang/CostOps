import { eq } from 'drizzle-orm'
import { db, m365UsersTable } from '@workspace/db'
import { GovernedRecommendationRepository } from '../../recommendations/recommendation-repository'
import { RecommendationGovernanceEventService } from '../../recommendations/governance-event-service'
import { appendUnifiedEvent } from '../../events/evidence-timeline'
import { generateM365GovernedRecommendations, type M365NormalizedRecommendationUser } from './m365-recommendation-orchestrator'

export type M365RecommendationGenerationSummary = {
  tenantId: string
  scannedUsers: number
  recommendationsCreated: number
  recommendationsUpdated: number
  skipped: number
  errors: Array<{ userId?: string; reason: string }>
  generatedAt: string
  message?: string
}

type Deps = {
  repo?: GovernedRecommendationRepository
  eventService?: RecommendationGovernanceEventService
  loadUsers?: (tenantId: string) => Promise<M365NormalizedRecommendationUser[]>
}

function fromRow(row: typeof m365UsersTable.$inferSelect): M365NormalizedRecommendationUser {
  return {
    tenantId: row.tenantId,
    userId: row.sourceObjectId,
    userPrincipalName: row.userPrincipalName,
    displayName: row.displayName,
    accountEnabled: row.accountEnabled,
    assignedLicenses: row.assignedLicenses,
    lastLoginDaysAgo: row.lastLoginDaysAgo,
    lifecycleState: row.connectorHealth === 'HEALTHY' && row.partialData !== 'true' ? 'TRUSTED' : 'STALE',
    confidenceScore: Math.max(0.4, Math.min(0.95, Number(row.dataFreshnessScore ?? 0.75))),
    sourceReferences: [`m365:user:${row.sourceObjectId}`, `m365:ingestion:${row.ingestionRunId}`, `m365:source:${row.sourceTimestamp.toISOString()}`],
    connectorHealth: row.connectorHealth,
    dataFreshnessScore: row.dataFreshnessScore,
    ingestionRunId: row.ingestionRunId,
    usageSignals: row.lastLoginDaysAgo && row.lastLoginDaysAgo > 45 ? ['low-usage-from-last-login'] : [],
    copilotUsageLevel: row.lastLoginDaysAgo && row.lastLoginDaysAgo > 30 ? 'NONE' : undefined,
    addonUsageLevel: row.lastLoginDaysAgo && row.lastLoginDaysAgo > 30 ? 'NONE' : undefined,
  }
}

export class M365RecommendationService {
  private readonly repo: GovernedRecommendationRepository
  private readonly eventService: RecommendationGovernanceEventService
  private readonly loadUsersOverride?: (tenantId: string) => Promise<M365NormalizedRecommendationUser[]>

  constructor(deps: Deps = {}) {
    this.repo = deps.repo ?? new GovernedRecommendationRepository()
    this.eventService = deps.eventService ?? new RecommendationGovernanceEventService()
    this.loadUsersOverride = deps.loadUsers
  }

  async loadNormalizedM365Users(tenantId: string) {
    if (this.loadUsersOverride) return this.loadUsersOverride(tenantId)
    const rows = await db.select().from(m365UsersTable).where(eq(m365UsersTable.tenantId, tenantId))
    return rows.map(fromRow)
  }

  async generateForTenant(tenantId: string, actorId = 'system'): Promise<M365RecommendationGenerationSummary> {
    if (!tenantId) throw new Error('tenantId required')
    const generatedAt = new Date().toISOString()
    const users = await this.loadNormalizedM365Users(tenantId)
    if (users.length === 0) return { tenantId, scannedUsers: 0, recommendationsCreated: 0, recommendationsUpdated: 0, skipped: 0, errors: [], generatedAt, message: 'No M365 usage/licence data has been ingested yet' }
    if (users.every((user) => String(user.connectorHealth ?? 'HEALTHY').toUpperCase() !== 'HEALTHY')) return { tenantId, scannedUsers: users.length, recommendationsCreated: 0, recommendationsUpdated: 0, skipped: users.length, errors: [{ reason: 'M365 connector unhealthy; generation blocked' }], generatedAt, message: 'M365 connector is unhealthy' }

    const result = generateM365GovernedRecommendations({ tenantId, users })
    let recommendationsCreated = 0
    let recommendationsUpdated = 0

    for (const recommendation of result.recommendations) {
      const before = await this.repo.getByRecommendationId(tenantId, recommendation.recommendationId)
      await this.repo.upsert(tenantId, recommendation, recommendation.evidencePointers)
      if (before) recommendationsUpdated++
      else recommendationsCreated++
      await this.eventService.emit({ tenantId, recommendationId: recommendation.recommendationId, eventType: before ? 'RECOMMENDATION_RECALCULATED' : 'RECOMMENDATION_CREATED', actorId, actorRole: 'SYSTEM', eventReason: 'M365 governance evaluation generated recommendation', afterState: recommendation.recommendationState, afterReadiness: recommendation.executionReadiness, evidenceSnapshot: recommendation.evidencePointers, blockedReasonsSnapshot: recommendation.blockedReasons, readinessReasonsSnapshot: recommendation.readinessReasons })
      appendUnifiedEvent({ eventId: `${recommendation.recommendationId}:${before ? 'updated' : 'created'}:${generatedAt}`, tenantId, entityType: 'RECOMMENDATION', entityId: recommendation.recommendationId, eventType: before ? 'RECOMMENDATION_UPDATED' : 'RECOMMENDATION_CREATED', eventCategory: 'RECOMMENDATION', actorId, actorRole: 'SYSTEM', eventReason: `M365 recommendation ${before ? 'updated' : 'created'} from live governance evaluation`, beforeState: before?.recommendationState ?? '', afterState: recommendation.recommendationState, evidenceSnapshot: recommendation.evidencePointers, sourceSystem: 'm365-recommendation-service', createdAt: generatedAt })
    }

    return { tenantId, scannedUsers: result.scannedUsers, recommendationsCreated, recommendationsUpdated, skipped: result.skipped, errors: result.errors, generatedAt, message: result.recommendations.length ? 'M365 governance evaluation complete' : 'No eligible M365 recommendations found' }
  }
}
