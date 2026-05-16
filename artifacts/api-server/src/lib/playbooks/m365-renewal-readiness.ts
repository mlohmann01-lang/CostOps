export function aggregateM365RenewalReadiness(recommendations: Array<any>) {
  const monthly = recommendations.reduce((a, r) => a + (r.projectedMonthlySavings ?? 0), 0);
  const trustBandDistribution: Record<string, number> = {};
  const confidenceDistribution: Record<string, number> = {};
  for (const r of recommendations) {
    trustBandDistribution[r.trustBand ?? "UNKNOWN"] = (trustBandDistribution[r.trustBand ?? "UNKNOWN"] ?? 0) + 1;
    confidenceDistribution[r.realizationConfidence ?? "UNKNOWN"] = (confidenceDistribution[r.realizationConfidence ?? "UNKNOWN"] ?? 0) + 1;
  }
  return {
    totalProjectedMonthlySavings: monthly,
    totalProjectedAnnualizedSavings: monthly * 12,
    disabledLicensedUsers: recommendations.filter((r) => r.type === "DISABLED_RECLAIM").length,
    inactiveLicensedUsers: recommendations.filter((r) => r.type === "INACTIVE_RECLAIM").length,
    highTierRightsizingCandidates: recommendations.filter((r) => /RIGHTSIZE|DOWNGRADE/.test(r.type ?? "")).length,
    copilotUnderutilizedCandidates: recommendations.filter((r) => /COPILOT/.test(r.type ?? "")).length,
    addonReclaimCandidates: recommendations.filter((r) => r.type === "ADDON_RECLAIM").length,
    overlapCandidates: recommendations.filter((r) => r.type === "OVERLAP_ELIMINATION").length,
    storageReviewCandidates: recommendations.filter((r) => r.type === "STORAGE_REVIEW").length,
    suppressedCount: recommendations.filter((r) => r.lifecycleState === "SUPPRESSED").length,
    needsEvidenceCount: recommendations.filter((r) => r.lifecycleState === "NEEDS_EVIDENCE").length,
    governanceReviewCount: recommendations.filter((r) => r.lifecycleState === "GOVERNANCE_REVIEW_REQUIRED").length,
    actionableReviewCount: recommendations.filter((r) => r.lifecycleState === "READY_FOR_REVIEW").length,
    confidenceDistribution,
    trustBandDistribution,
    explainabilitySummary: "Aggregate-only advisory; atomic recommendations preserved; no direct execution",
  };
}
