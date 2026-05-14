import { deriveReadinessBlockers } from "./readiness-blockers";

const BLOCKER_PENALTY: Record<string, number> = {
  OWNER_MISSING: 0.25,
  ENTITLEMENTS_UNMAPPED: 0.2,
  PRICING_UNKNOWN: 0.15,
  CONTRACT_MISSING: 0.1,
  USAGE_UNAVAILABLE: 0.1,
  SOURCE_STALE: 0.1,
  RECONCILIATION_CONFLICT: 0.2,
  COST_CENTER_MISSING: 0.05,
};

export function scoreAppOnboarding(appContext: any) {
  const base = 0.95;
  const blockerInfo = deriveReadinessBlockers(appContext);
  const penalty = blockerInfo.blockers.reduce((sum, b) => sum + (BLOCKER_PENALTY[b] ?? 0.05), 0);
  const onboardingConfidence = Math.max(0, Number((base - penalty).toFixed(3)));

  let readinessStatus: string = "NEEDS_ENRICHMENT";
  if (onboardingConfidence >= 0.85) readinessStatus = "READY_FOR_GOVERNANCE";
  else if (blockerInfo.blockers.includes("OWNER_MISSING")) readinessStatus = "NEEDS_OWNER";
  else if (blockerInfo.blockers.includes("ENTITLEMENTS_UNMAPPED")) readinessStatus = "NEEDS_ENTITLEMENT_MAPPING";
  else if (blockerInfo.blockers.includes("PRICING_UNKNOWN")) readinessStatus = "NEEDS_PRICING";
  else if (blockerInfo.blockers.includes("RECONCILIATION_CONFLICT")) readinessStatus = "NEEDS_RECONCILIATION";

  return { onboardingConfidence, blockers: blockerInfo.blockers, warnings: blockerInfo.warnings, recommendedNextActions: blockerInfo.recommendedNextActions, readinessStatus };
}
