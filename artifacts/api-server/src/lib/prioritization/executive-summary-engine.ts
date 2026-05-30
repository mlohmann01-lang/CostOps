import type { ExecutivePriority, ExecutiveSummary } from "./executive-priority-types";

export function buildExecutiveSummary(tenantId: string, priorities: ExecutivePriority[], generatedAt = "2026-05-30T12:00:00.000Z"): ExecutiveSummary {
  const topFive = priorities.slice(0, 5);
  const topFiveMonthlySavings = topFive.reduce((sum, priority) => sum + priority.projectedMonthlySavings, 0);
  const averageTrustScore = priorities.length ? Math.round(priorities.reduce((sum, priority) => sum + priority.trustScore, 0) / priorities.length) : 0;
  const averageConfidence = priorities.length ? priorities.reduce((sum, priority) => sum + priority.confidenceScore, 0) / priorities.length : 0;
  const confidenceBand = averageConfidence >= 80 ? "HIGH" : averageConfidence >= 65 ? "MEDIUM" : "LOW";
  const actionableCount = priorities.filter((priority) => priority.readiness === "ELIGIBLE" || priority.readiness === "APPROVAL_REQUIRED").length;
  const executionReadinessPercent = priorities.length ? Math.round((actionableCount / priorities.length) * 100) : 0;
  const topOpportunity = priorities[0];
  const summaryNarrative = topFive.length ? `If you execute the top 5 opportunities, Certen estimates $${topFiveMonthlySavings.toLocaleString()}/month potential savings with ${confidenceBand} confidence. ${topFive.filter((priority) => priority.readiness === "ELIGIBLE").length} of the top 5 are ready now; ${topFive.filter((priority) => priority.readiness === "APPROVAL_REQUIRED").length} require approval.` : "No executive priorities are available yet.";
  return { tenantId, totalOpportunities: priorities.length, topFiveMonthlySavings, topFiveAnnualSavings: topFiveMonthlySavings * 12, readyNowCount: topFive.filter((priority) => priority.readiness === "ELIGIBLE").length, approvalRequiredCount: topFive.filter((priority) => priority.readiness === "APPROVAL_REQUIRED").length, blockedCount: topFive.filter((priority) => priority.readiness === "BLOCKED").length, averageTrustScore, confidenceBand, executionReadinessPercent, topOpportunityTitle: topOpportunity?.title ?? "None", topOpportunityValue: topOpportunity?.projectedMonthlySavings ?? 0, summaryNarrative, generatedAt };
}
