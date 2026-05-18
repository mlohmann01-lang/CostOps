import type { AIUsageRecord } from "./ai-usage-normalization";

export interface AICostSummary {
  totalCost: number;
  totalTokens: number;
  blendedCostPer1kTokens: number;
}

export function computeAICostSummary(records: AIUsageRecord[]): AICostSummary {
  const totalCost = records.reduce((sum, r) => sum + r.estimatedCost, 0);
  const totalTokens = records.reduce((sum, r) => sum + r.tokens, 0);
  const blendedCostPer1kTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0;

  return { totalCost, totalTokens, blendedCostPer1kTokens };
}
