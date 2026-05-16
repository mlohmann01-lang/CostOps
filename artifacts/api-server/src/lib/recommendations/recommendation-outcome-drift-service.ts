import { RecommendationOutcomeResolutionService } from "./recommendation-outcome-resolution-service";

export class RecommendationOutcomeDriftService {
  constructor(private readonly resolution = new RecommendationOutcomeResolutionService()) {}

  async recheckRecommendationOutcome(tenantId: string, recommendationId: string) {
    return this.resolution.resolveRecommendationOutcome(tenantId, recommendationId);
  }
}
