import type { AIUsageRecord } from "./ai-usage-normalization";
import { buildRecommendationCandidate, type RecommendationCandidate } from "./ai-recommendation-candidates";

export const AI_PLAYBOOKS = {
  INACTIVE_COPILOT_LICENSE_RECLAIM: "INACTIVE_COPILOT_LICENSE_RECLAIM",
  DUPLICATE_AI_TOOL_DETECTION: "DUPLICATE_AI_TOOL_DETECTION",
  AI_TOOL_RATIONALIZATION: "AI_TOOL_RATIONALIZATION",
  EXPENSIVE_MODEL_USAGE_REVIEW: "EXPENSIVE_MODEL_USAGE_REVIEW",
  LOW_AI_ADOPTION_REVIEW: "LOW_AI_ADOPTION_REVIEW",
  AI_SPEND_DRIFT_DETECTION: "AI_SPEND_DRIFT_DETECTION",
  AI_PRODUCTIVITY_GAP_DETECTION: "AI_PRODUCTIVITY_GAP_DETECTION",
} as const;

export function runAICostPlaybooks(records: AIUsageRecord[]): RecommendationCandidate[] {
  const recommendations: RecommendationCandidate[] = [];
  const totalCost = records.reduce((sum, record) => sum + record.estimatedCost, 0);
  const avgProductivity = records.length ? records.reduce((sum, record) => sum + record.productivitySignal, 0) / records.length : 0;

  recommendations.push(
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.INACTIVE_COPILOT_LICENSE_RECLAIM,
      priority: "MEDIUM",
      title: "Review inactive Copilot licenses",
      summary: "Detect users with persistent low activity and reclaim underutilized seats.",
      evidence: { recordCount: records.length },
    }),
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.DUPLICATE_AI_TOOL_DETECTION,
      priority: "HIGH",
      title: "Detect duplicate AI tooling",
      summary: "Identify overlapping AI tools used by the same teams.",
      evidence: { uniqueTools: new Set(records.map((record) => record.toolId)).size },
    }),
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.AI_TOOL_RATIONALIZATION,
      priority: "MEDIUM",
      title: "Rationalize AI tool portfolio",
      summary: "Consolidate tools where overlap and cost concentration are high.",
      evidence: { totalCost },
    }),
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.EXPENSIVE_MODEL_USAGE_REVIEW,
      priority: "HIGH",
      title: "Review expensive model usage",
      summary: "Detect workloads that can be routed to lower-cost models.",
      evidence: { highCostEvents: records.filter((record) => record.estimatedCost > 20).length },
    }),
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.LOW_AI_ADOPTION_REVIEW,
      priority: "MEDIUM",
      title: "Review low AI adoption",
      summary: "Flag groups with active licenses but low usage frequency.",
      evidence: { potentialInactiveUsers: records.filter((record) => record.tokens < 100).length },
    }),
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.AI_SPEND_DRIFT_DETECTION,
      priority: totalCost > 1000 ? "HIGH" : "MEDIUM",
      title: "Detect AI spend drift",
      summary: "Spot abnormal cost acceleration and trigger governance controls.",
      evidence: { totalCost },
    }),
    buildRecommendationCandidate({
      recommendationType: AI_PLAYBOOKS.AI_PRODUCTIVITY_GAP_DETECTION,
      priority: avgProductivity < 0.3 ? "HIGH" : "LOW",
      title: "Detect AI productivity gaps",
      summary: "Highlight usage where spending is not translating into measurable productivity.",
      evidence: { avgProductivity },
    }),
  );

  return recommendations;
}
