import { GovernedRecommendationRepository } from '../recommendations/recommendation-repository';
import { RecommendationGovernanceEventService } from '../recommendations/governance-event-service';
import { appendUnifiedEvent } from '../events/evidence-timeline';
import { generateFlexeraRecommendations } from './flexera/flexera-recommendation-generator';
import type { FlexeraProductionService } from '../production-connectors/flexera/flexera-production-service';

export type FlexeraRecommendationGenerationSummary = {
  tenantId: string;
  entitiesEvaluated: number;
  recommendationsCreated: number;
  recommendationsUpdated: number;
  generatedAt: string;
  message?: string;
};

type Deps = {
  repo?: GovernedRecommendationRepository;
  eventService?: RecommendationGovernanceEventService;
};

export class FlexeraRecommendationService {
  private readonly repo: GovernedRecommendationRepository;
  private readonly eventService: RecommendationGovernanceEventService;

  constructor(deps: Deps = {}) {
    this.repo = deps.repo ?? new GovernedRecommendationRepository();
    this.eventService = deps.eventService ?? new RecommendationGovernanceEventService();
  }

  async generateForTenant(tenantId: string, flexera: FlexeraProductionService, actorId = 'system'): Promise<FlexeraRecommendationGenerationSummary> {
    if (!tenantId) throw new Error('tenantId required');
    const generatedAt = new Date().toISOString();
    const discovery = await flexera.discover(tenantId);
    const { recommendations, summary } = generateFlexeraRecommendations(discovery);
    let recommendationsCreated = 0;
    let recommendationsUpdated = 0;

    for (const recommendation of recommendations) {
      const before = await this.repo.getByRecommendationId(tenantId, recommendation.recommendationId);
      await this.repo.upsert(tenantId, recommendation, recommendation.evidencePointers);
      if (before) recommendationsUpdated++;
      else recommendationsCreated++;
      await this.eventService.emit({ tenantId, recommendationId: recommendation.recommendationId, eventType: before ? 'RECOMMENDATION_RECALCULATED' : 'RECOMMENDATION_CREATED', actorId, actorRole: 'SYSTEM', eventReason: 'Flexera discovery generated recommendation', afterState: recommendation.recommendationState, afterReadiness: recommendation.executionReadiness, evidenceSnapshot: recommendation.evidencePointers, blockedReasonsSnapshot: recommendation.blockedReasons, readinessReasonsSnapshot: recommendation.readinessReasons });
      appendUnifiedEvent({ eventId: `${recommendation.recommendationId}:${before ? 'updated' : 'created'}:${generatedAt}`, tenantId, entityType: 'RECOMMENDATION', entityId: recommendation.recommendationId, eventType: before ? 'RECOMMENDATION_UPDATED' : 'RECOMMENDATION_CREATED', eventCategory: 'RECOMMENDATION', actorId, actorRole: 'SYSTEM', eventReason: `Flexera recommendation ${before ? 'updated' : 'created'} from discovery`, beforeState: before?.recommendationState ?? '', afterState: recommendation.recommendationState, evidenceSnapshot: recommendation.evidencePointers, sourceSystem: 'flexera-recommendation-service', createdAt: generatedAt });
    }

    return { tenantId, entitiesEvaluated: summary.entitiesEvaluated, recommendationsCreated, recommendationsUpdated, generatedAt, message: recommendations.length ? 'Flexera discovery evaluation complete' : 'No eligible Flexera recommendations found' };
  }
}
