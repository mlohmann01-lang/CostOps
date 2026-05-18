export interface AIFinalRecommendationReportInput { decisions: Array<{ finalDecision: string; confidenceScore?: number; sensitivityClass?: string; annualizedSavingsEstimate?: number; spendAtRisk?: number; productivityOpportunity?: number }>; conflictCount: number; }

export function computeAIEconomicsRecommendationReport(input: AIFinalRecommendationReportInput) {
  const totalCandidates = input.decisions.length;
  const count = (k: string) => input.decisions.filter((d) => d.finalDecision === k).length;
  const promotedCount = count("PROMOTED") + count("PROMOTED_WITH_APPROVAL");
  const approvalRequiredCount = count("PROMOTED_WITH_APPROVAL");
  const suppressedCount = count("SUPPRESSED_DUPLICATE") + count("SUPPRESSED_CONFLICT");
  const deferredCount = count("DEFERRED"); const blockedCount = count("BLOCKED");
  const highSensitivityCount = input.decisions.filter((d) => d.sensitivityClass === "HIGH" || d.sensitivityClass === "CRITICAL").length;
  const lowConfidenceCount = input.decisions.filter((d) => (d.confidenceScore ?? 1) < 0.5).length;
  const estimatedAnnualAISavings = input.decisions.reduce((s, d) => s + (d.annualizedSavingsEstimate ?? 0), 0);
  const estimatedAISpendAtRisk = input.decisions.reduce((s, d) => s + (d.spendAtRisk ?? 0), 0);
  const estimatedProductivityOpportunity = input.decisions.reduce((s, d) => s + (d.productivityOpportunity ?? 0), 0);
  const domainReadinessStatus = blockedCount > 0 ? "HARDENING_REQUIRED" : lowConfidenceCount > 0 ? "READY_WITH_LIMITS" : "READY_FOR_AI_PLAYBOOK_PACK_2";
  return { totalCandidates, promotedCount, approvalRequiredCount, suppressedCount, deferredCount, blockedCount, conflictCount: input.conflictCount, highSensitivityCount, lowConfidenceCount, estimatedAnnualAISavings, estimatedAISpendAtRisk, estimatedProductivityOpportunity, aiGovernanceRiskScore: highSensitivityCount / Math.max(1, totalCandidates), recommendationQualityScore: promotedCount / Math.max(1, totalCandidates), outcomeLedgerReadinessStatus: blockedCount === 0 ? "READY" : "PARTIAL", decisionIntelligenceStatus: "ACTIVE", domainReadinessStatus, topRiskAreas: ["shadow-ai", "cost-drift"], recommendedNextAIPlaybooks: ["AI token efficiency optimization", "AI adoption effectiveness"] };
}
