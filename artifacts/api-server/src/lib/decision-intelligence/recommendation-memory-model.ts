export interface RecommendationHistoryRecord { approved?: boolean; rejected?: boolean; deferred?: boolean; overridden?: boolean; reversed?: boolean; falsePositive?: boolean; savingsRealizedRate?: number; }
export interface RecommendationMemorySummary { priorRecommendationCount: number; priorApprovalCount: number; priorRejectionCount: number; priorDeferralCount: number; priorOverrideCount: number; priorReversalCount: number; priorFalsePositiveCount: number; priorSavingsRealizationRate: number; overrideRate: number; reversalRate: number; savingsRealizationRate: number; memoryRiskClass: "LOW"|"MODERATE"|"HIGH"|"UNKNOWN"; confidenceAdjustment: number; memoryReasons: string[]; entitySpecificHistory?: number; departmentSpecificHistory?: number; playbookSpecificHistory?: number; }
export const summarizeRecommendationMemory = (history: RecommendationHistoryRecord[] = []): RecommendationMemorySummary => {
  const total = history.length; const count = (k: keyof RecommendationHistoryRecord) => history.filter(h => h[k]).length;
  const priorOverrideCount = count("overridden"); const priorReversalCount = count("reversed");
  const savingsRealizationRate = total ? history.reduce((a,h)=>a+(h.savingsRealizedRate ?? 0),0)/total : 0;
  const overrideRate = total ? priorOverrideCount / total : 0; const reversalRate = total ? priorReversalCount / total : 0;
  const risk = total === 0 ? "UNKNOWN" : (overrideRate + reversalRate > 0.35 || count("falsePositive")/total > 0.2) ? "HIGH" : (overrideRate + reversalRate > 0.15) ? "MODERATE" : "LOW";
  const adjustment = risk === "HIGH" ? -20 : risk === "MODERATE" ? -8 : risk === "LOW" ? 5 : -3;
  return { priorRecommendationCount: total, priorApprovalCount: count("approved"), priorRejectionCount: count("rejected"), priorDeferralCount: count("deferred"), priorOverrideCount, priorReversalCount, priorFalsePositiveCount: count("falsePositive"), priorSavingsRealizationRate: savingsRealizationRate, overrideRate, reversalRate, savingsRealizationRate, memoryRiskClass: risk, confidenceAdjustment: adjustment, memoryReasons: [risk === "UNKNOWN" ? "limited history" : `memory risk class: ${risk}`] };
};
