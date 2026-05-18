import type { AIUsageRecord } from "./ai-usage-normalization";

export type AISpendClass = "BASELINE" | "OPTIMIZABLE" | "HIGH_RISK";

export function classifyAISpend(record: AIUsageRecord): AISpendClass {
  if (record.estimatedCost >= 20 || record.tokens >= 100_000) return "HIGH_RISK";
  if (record.estimatedCost >= 5 || record.tokens >= 25_000) return "OPTIMIZABLE";
  return "BASELINE";
}
