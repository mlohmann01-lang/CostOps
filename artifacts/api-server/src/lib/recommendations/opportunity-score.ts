export type PriorityBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface OpportunityScoreInput {
  projectedAnnualSavings: number;
  verifiedSavingsHistory?: number;
  confidenceScore: number;
  reliabilityBand: string;
  lifecycleState: string;
  executionReadiness: string;
  riskClass: string;
  rollbackSupport: boolean;
  driftLikelihood: number;
  policyComplexity: number;
  recommendationAgeDays: number;
  playbookType: string;
  executionFeasibility: number;
}

export interface OpportunityScoreBreakdown {
  opportunityScore: number;
  priorityBand: PriorityBand;
  economicImpactScore: number;
  governanceConfidenceScore: number;
  executionFeasibilityScore: number;
  operationalComplexityScore: number;
  rationale: string[];
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const normalize = (n: number, d: number) => clamp((n / d) * 100);

export function scoreOpportunity(input: OpportunityScoreInput): OpportunityScoreBreakdown {
  const economicImpactScore = clamp(normalize(input.projectedAnnualSavings, 24000) * 0.7 + normalize(input.verifiedSavingsHistory ?? 0, 24000) * 0.3);
  const readinessBoost = input.executionReadiness === "AUTO_EXECUTE_ELIGIBLE" ? 12 : input.executionReadiness === "EXECUTION_READY" ? 8 : input.executionReadiness === "APPROVAL_REQUIRED" ? 3 : -8;
  const reliabilityMultiplier = input.reliabilityBand === "HIGH" ? 1.1 : input.reliabilityBand === "MEDIUM" ? 1 : 0.8;
  const governanceConfidenceScore = clamp((input.confidenceScore * reliabilityMultiplier) + readinessBoost - input.policyComplexity * 12);
  const riskPenalty = input.riskClass === "A" ? 3 : input.riskClass === "B" ? 8 : input.riskClass === "C" ? 14 : 20;
  const rollbackBonus = input.rollbackSupport ? 10 : -12;
  const executionFeasibilityScore = clamp(input.executionFeasibility + rollbackBonus - riskPenalty - input.driftLikelihood * 10);
  const stalePenalty = input.recommendationAgeDays > 90 ? 12 : input.recommendationAgeDays > 45 ? 6 : 0;
  const operationalComplexityScore = clamp(input.policyComplexity * 50 + (input.lifecycleState.includes("BLOCK") ? 20 : 0) + stalePenalty + (input.playbookType.includes("RIGHTSIZE") ? 8 : 0));

  const opportunityScore = clamp(
    economicImpactScore * 0.38 + governanceConfidenceScore * 0.26 + executionFeasibilityScore * 0.24 - operationalComplexityScore * 0.12,
  );

  const priorityBand: PriorityBand = opportunityScore >= 85 ? "CRITICAL" : opportunityScore >= 70 ? "HIGH" : opportunityScore >= 45 ? "MEDIUM" : "LOW";
  const rationale: string[] = [];
  if (economicImpactScore >= 70 && governanceConfidenceScore >= 65) rationale.push("High projected savings with strong evidence");
  if (governanceConfidenceScore < 50) rationale.push("Reduced priority due to low confidence");
  if (operationalComplexityScore >= 60) rationale.push("Requires complex governance approval");
  if (input.rollbackSupport) rationale.push("Rollback support available");
  if (input.driftLikelihood >= 0.7) rationale.push("Drift-prone area increases monitoring priority");

  return { opportunityScore, priorityBand, economicImpactScore, governanceConfidenceScore, executionFeasibilityScore, operationalComplexityScore, rationale };
}
