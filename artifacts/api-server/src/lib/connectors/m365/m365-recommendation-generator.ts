import type { EvidenceFreshnessState, M365NormalizedUserLicenseEvidence } from "./m365-readonly-evidence-sync-service";

export type M365SavingsConfidence = "HIGH" | "MEDIUM" | "LOW";
export type M365TrustScore = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

export type M365SkuPricing = { skuId: string; skuName?: string; monthlyPrice: number; currency?: string };
export type M365RecommendationType = "LICENSE_RECLAIM" | "LICENSE_REVIEW";

export type M365GeneratedRecommendation = {
  tenantId: string;
  provider: "Microsoft 365";
  playbookId: "m365-disabled-licensed-user-reclaim" | "m365-inactive-licensed-user-review";
  recommendationType: M365RecommendationType;
  affectedUserId: string;
  affectedUserPrincipalName: string;
  affectedDisplayName: string;
  assignedSkuIds: string[];
  assignedSkuNames: string[];
  assignedLicenseCount: number;
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  savingsConfidence: M365SavingsConfidence;
  trustScore: M365TrustScore;
  evidenceFreshness: EvidenceFreshnessState;
  evidenceConfidence: number;
  approvalRequirement: "REQUIRED" | "RECOMMENDED";
  rollbackFeasibility: "HIGH" | "MEDIUM" | "LOW";
  blastRadius: "LOW" | "MEDIUM";
  verificationStrategy: string;
  proofReferences: string[];
  exclusionReasons: string[];
  currentState: string;
  recommendedAction: string;
  createdAt: string;
  calculationExplanation: string;
};

export type M365RecommendationGenerationSummary = {
  usersEvaluated: number;
  recommendationsGenerated: number;
  disabledLicensedUserRecommendations: number;
  inactiveLicensedUserRecommendations: number;
  excludedUsers: number;
  totalProjectedMonthlySavings: number;
  totalProjectedAnnualSavings: number;
  averageTrustScore: number;
  warnings: string[];
};

export type M365RecommendationGenerationOptions = {
  inactivityDaysThreshold?: number;
  evidenceConfidenceThreshold?: number;
  confidenceAdjustment?: number;
};

const trustNumeric: Record<M365TrustScore, number> = { HIGH: 1, MEDIUM: 0.7, LOW: 0.4, INSUFFICIENT: 0.1 };

function computeTrustScore(user: M365NormalizedUserLicenseEvidence): M365TrustScore {
  if (user.evidenceFreshness === "MISSING" || user.assignedLicenseCount <= 0) return "INSUFFICIENT";
  if (user.exclusionReasons.length > 0) return "LOW";
  if (user.evidenceFreshness === "FRESH" && user.evidenceConfidence >= 0.85) return "HIGH";
  if (user.evidenceConfidence >= 0.6) return "MEDIUM";
  return "LOW";
}

function calculateSavings(input: { assignedSkuIds: string[]; assignedSkuNames: string[]; pricing: M365SkuPricing[]; confidenceAdjustment: number; freshness: EvidenceFreshnessState }): { monthly: number; annual: number; confidence: M365SavingsConfidence; explanation: string; warnings: string[] } {
  const warnings: string[] = [];
  const pricingById = new Map(input.pricing.map((p) => [p.skuId, p]));
  const prices = input.assignedSkuIds.map((id) => pricingById.get(id)?.monthlyPrice ?? null);
  const missing = input.assignedSkuIds.filter((id, idx) => prices[idx] == null);
  const base = prices.reduce<number>((sum, p) => sum + (p ?? 0), 0);
  const freshnessMultiplier = input.freshness === "FRESH" ? 1 : input.freshness === "STALE" ? 0.85 : 0.7;
  const adjusted = Math.max(0, base * freshnessMultiplier * input.confidenceAdjustment);
  const confidence: M365SavingsConfidence = missing.length > 0 ? "LOW" : input.freshness === "FRESH" ? "HIGH" : "MEDIUM";
  if (missing.length > 0) warnings.push(`Missing pricing for SKU IDs: ${missing.join(",")}`);
  const explanation = `baseMonthly=${base.toFixed(2)} freshnessMultiplier=${freshnessMultiplier} confidenceAdjustment=${input.confidenceAdjustment.toFixed(2)} missingPricing=${missing.length}`;
  return { monthly: Number(adjusted.toFixed(2)), annual: Number((adjusted * 12).toFixed(2)), confidence, explanation, warnings };
}

export function generateM365Recommendations(input: { tenantId: string; normalizedEvidence: M365NormalizedUserLicenseEvidence[]; skuPricingCatalog: M365SkuPricing[]; generationOptions?: M365RecommendationGenerationOptions }): { recommendations: M365GeneratedRecommendation[]; summary: M365RecommendationGenerationSummary } {
  const options = input.generationOptions ?? {};
  const inactivityThreshold = options.inactivityDaysThreshold ?? 45;
  const evidenceThreshold = options.evidenceConfidenceThreshold ?? 0.6;
  const confidenceAdjustment = options.confidenceAdjustment ?? 1;

  const warnings = new Set<string>();
  const recommendations: M365GeneratedRecommendation[] = [];

  for (const user of input.normalizedEvidence) {
    const trustScore = computeTrustScore(user);
    if (user.exclusionReasons.length > 0 || trustScore === "INSUFFICIENT") continue;

    const disabledEligible = user.accountEnabled === false && user.assignedLicenseCount > 0 && user.isAdminProtected === false && user.isServiceAccountCandidate === false && user.exclusionReasons.length === 0 && user.evidenceFreshness !== "MISSING" && user.evidenceConfidence >= evidenceThreshold;
    const inactiveEligible = user.accountEnabled === true && user.assignedLicenseCount > 0 && (user.inactivityDays ?? 0) >= inactivityThreshold && user.isAdminProtected === false && user.isServiceAccountCandidate === false && user.evidenceFreshness !== "MISSING";

    if (!disabledEligible && !inactiveEligible) continue;

    const savings = calculateSavings({ assignedSkuIds: user.assignedSkuIds, assignedSkuNames: user.assignedSkuNames, pricing: input.skuPricingCatalog, confidenceAdjustment, freshness: user.evidenceFreshness });
    for (const w of savings.warnings) warnings.add(`${user.userPrincipalName}: ${w}`);
    const recommendationType: M365RecommendationType = disabledEligible ? "LICENSE_RECLAIM" : "LICENSE_REVIEW";

    recommendations.push({
      tenantId: input.tenantId,
      provider: "Microsoft 365",
      playbookId: disabledEligible ? "m365-disabled-licensed-user-reclaim" : "m365-inactive-licensed-user-review",
      recommendationType,
      affectedUserId: user.userId,
      affectedUserPrincipalName: user.userPrincipalName,
      affectedDisplayName: user.displayName,
      assignedSkuIds: user.assignedSkuIds,
      assignedSkuNames: user.assignedSkuNames,
      assignedLicenseCount: user.assignedLicenseCount,
      projectedMonthlySavings: savings.monthly,
      projectedAnnualSavings: savings.annual,
      savingsConfidence: savings.confidence,
      trustScore,
      evidenceFreshness: user.evidenceFreshness,
      evidenceConfidence: user.evidenceConfidence,
      approvalRequirement: disabledEligible ? "REQUIRED" : "RECOMMENDED",
      rollbackFeasibility: "HIGH",
      blastRadius: user.assignedLicenseCount > 3 ? "MEDIUM" : "LOW",
      verificationStrategy: disabledEligible ? "Verify license reclaim in simulation and post-change Graph assignment check." : "Review inactivity evidence, simulate impact, then approve any reclaim.",
      proofReferences: [
        `m365:account-status:${user.userId}`,
        `m365:license-assignment:${user.userId}`,
        `m365:activity:${user.userId}`,
        `m365:protection:${user.userId}`,
        `m365:savings-calculation:${user.userId}`,
        `m365:rollback-feasibility:${user.userId}`,
        `m365:verification-strategy:${user.userId}`,
      ],
      exclusionReasons: user.exclusionReasons,
      currentState: disabledEligible ? "Disabled user still holds active licenses." : `Enabled licensed user inactive for ${user.inactivityDays ?? "unknown"} days.`,
      recommendedAction: disabledEligible ? "Queue governed reclaim recommendation for assigned licenses." : "Queue governed review and simulation before reclaim.",
      createdAt: new Date().toISOString(),
      calculationExplanation: savings.explanation,
    });
  }

  const trustValues = recommendations.map((r) => trustNumeric[r.trustScore]);
  const totalMonthly = recommendations.reduce((sum, r) => sum + r.projectedMonthlySavings, 0);
  const totalAnnual = recommendations.reduce((sum, r) => sum + r.projectedAnnualSavings, 0);

  return {
    recommendations,
    summary: {
      usersEvaluated: input.normalizedEvidence.length,
      recommendationsGenerated: recommendations.length,
      disabledLicensedUserRecommendations: recommendations.filter((r) => r.recommendationType === "LICENSE_RECLAIM").length,
      inactiveLicensedUserRecommendations: recommendations.filter((r) => r.recommendationType === "LICENSE_REVIEW").length,
      excludedUsers: input.normalizedEvidence.filter((u) => u.exclusionReasons.length > 0).length,
      totalProjectedMonthlySavings: Number(totalMonthly.toFixed(2)),
      totalProjectedAnnualSavings: Number(totalAnnual.toFixed(2)),
      averageTrustScore: trustValues.length > 0 ? Number((trustValues.reduce((a, b) => a + b, 0) / trustValues.length).toFixed(2)) : 0,
      warnings: [...warnings],
    },
  };
}
