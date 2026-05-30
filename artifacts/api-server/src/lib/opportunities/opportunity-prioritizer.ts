import type { Opportunity, OpportunityPriorityBand, RankedOpportunity } from "./opportunity-types";

const urgencyWeight: Record<Opportunity["urgency"], number> = { CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25 };

export function scoreOpportunity(opportunity: Opportunity) {
  return Math.round((opportunity.projectedMonthlySavings * 0.4 + opportunity.trustScore * 0.2 + opportunity.confidenceScore * 0.2 + urgencyWeight[opportunity.urgency] * 0.2) * 100) / 100;
}

export function priorityBand(score: number): OpportunityPriorityBand {
  if (score >= 90) return "CRITICAL";
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

export function rankOpportunities(opportunities: Opportunity[]): RankedOpportunity[] {
  return opportunities.map((opportunity) => ({ ...opportunity, rank: 0, score: scoreOpportunity(opportunity), priorityBand: priorityBand(scoreOpportunity(opportunity)) }))
    .sort((a, b) => b.score - a.score || b.projectedMonthlySavings - a.projectedMonthlySavings)
    .map((opportunity, index) => ({ ...opportunity, rank: index + 1 }));
}
