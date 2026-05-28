import { scoreOpportunity, type OpportunityScoreBreakdown, type OpportunityScoreInput } from "./opportunity-score";

export type RankedRecommendation<T> = T & OpportunityScoreBreakdown;

export function rankRecommendations<T extends { recommendationId: string }>(recommendations: T[], toScoreInput: (row: T) => OpportunityScoreInput): RankedRecommendation<T>[] {
  return recommendations
    .map((row) => ({ ...row, ...scoreOpportunity(toScoreInput(row)) }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore || String(a.recommendationId).localeCompare(String(b.recommendationId)));
}
