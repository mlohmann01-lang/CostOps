import type { CrossDomainEconomicReport } from "./cross-domain-economic-types";

export function computeCrossDomainEconomicReport(input: Omit<CrossDomainEconomicReport, "generatedAt"|"readinessStatus"> & {totalSpendSignals:number;totalUsageSignals:number;totalOutcomeSignals:number;}) {
  const promotedRecommendationCount = input.recommendations.filter((r)=>r.decision === "PROMOTED" || r.decision === "PROMOTED_WITH_APPROVAL").length;
  const suppressedRecommendationCount = input.recommendations.filter((r)=>r.decision.includes("SUPPRESSED")).length;
  const deferredRecommendationCount = input.recommendations.filter((r)=>r.decision === "DEFERRED").length;
  const blockedRecommendationCount = input.recommendations.filter((r)=>r.decision === "BLOCKED").length;
  const estimatedSpendAtRisk = input.duplicationFindings.reduce((s, d) => s + d.annualizedCostAtRisk, 0);
  const governanceRiskScore = input.governanceRisks.length / Math.max(1, input.recommendations.length);
  const recommendationQualityScore = promotedRecommendationCount / Math.max(1, input.recommendations.length);
  const readinessStatus = blockedRecommendationCount > 0 ? "HARDENING_REQUIRED" : governanceRiskScore > 0.5 ? "READY_WITH_LIMITS" : "READY_FOR_CROSS_DOMAIN_PLAYBOOKS";
  return { ...input, generatedAt:new Date().toISOString(), readinessStatus, totalSpendSignals:input.totalSpendSignals, totalUsageSignals:input.totalUsageSignals, totalOutcomeSignals:input.totalOutcomeSignals, duplicationFindingCount: input.duplicationFindings.length, governanceRiskCount: input.governanceRisks.length, promotedRecommendationCount, suppressedRecommendationCount, deferredRecommendationCount, blockedRecommendationCount, estimatedSpendAtRisk, governanceRiskScore, recommendationQualityScore, topSavingsOpportunities: input.recommendations.slice(0,3).map((r)=>r.recommendationId), topGovernanceRisks: input.governanceRisks.slice(0,3).map((r)=>r.riskType), topDuplicationFindings: input.duplicationFindings.slice(0,3).map((d)=>d.duplicationType) };
}
