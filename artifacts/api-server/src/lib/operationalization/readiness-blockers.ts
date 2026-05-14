export type BlockerType =
  | "OWNER_MISSING"
  | "ENTITLEMENTS_UNMAPPED"
  | "PRICING_UNKNOWN"
  | "CONTRACT_MISSING"
  | "USAGE_UNAVAILABLE"
  | "SOURCE_STALE"
  | "RECONCILIATION_CONFLICT"
  | "COST_CENTER_MISSING";

const ACTIONS: Record<BlockerType, string> = {
  OWNER_MISSING: "Assign business owner",
  ENTITLEMENTS_UNMAPPED: "Map entitlements from Flexera/ServiceNow",
  PRICING_UNKNOWN: "Connect pricing evidence or import tenant pricing",
  CONTRACT_MISSING: "Link ServiceNow/Flexera contract records",
  USAGE_UNAVAILABLE: "Enable usage data ingestion",
  SOURCE_STALE: "Run connector sync to refresh source data",
  RECONCILIATION_CONFLICT: "Resolve source mismatch before governance",
  COST_CENTER_MISSING: "Populate cost center metadata",
};

export function deriveReadinessBlockers(appContext: any) {
  const blockers: BlockerType[] = [];
  const warnings: string[] = [];
  if (!appContext.owner) blockers.push("OWNER_MISSING");
  if (!appContext.entitlementCount) blockers.push("ENTITLEMENTS_UNMAPPED");
  if (!appContext.annualCost && !appContext.monthlyCost) blockers.push("PRICING_UNKNOWN");
  if (!(appContext.contractIds ?? []).length) blockers.push("CONTRACT_MISSING");
  if (!appContext.userCount) blockers.push("USAGE_UNAVAILABLE");
  if (!appContext.costCenter) blockers.push("COST_CENTER_MISSING");
  if (appContext.reconciliationConflict) blockers.push("RECONCILIATION_CONFLICT");
  if ((appContext.sourceFreshness ?? 1) < 0.5) blockers.push("SOURCE_STALE");
  if (blockers.length >= 4) warnings.push("Multiple readiness gaps detected");
  return { blockers, warnings, recommendedNextActions: blockers.map((b) => ACTIONS[b]) };
}
