export interface RecommendationCandidate {
  recommendationType: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  route: "DECISION_INTELLIGENCE";
}

export function buildRecommendationCandidate(input: Omit<RecommendationCandidate, "route">): RecommendationCandidate {
  return { ...input, route: "DECISION_INTELLIGENCE" };
}
