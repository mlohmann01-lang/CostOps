import type { StoredVendorChangeEvent, VendorChangeOpportunity, VendorImpactAssessment } from "./vendor-change-types";

export function generateVendorChangeOpportunities(change: StoredVendorChangeEvent, impact: VendorImpactAssessment): VendorChangeOpportunity[] {
  const now = new Date().toISOString();
  const baseSavings = Math.max(250, Math.round(impact.monthlyCostDelta / Math.max(1, impact.potentialActions.length)));
  return impact.potentialActions.map((action, index) => ({
    opportunityId: `opp-${change.id}-${index + 1}`,
    tenantId: impact.tenantId,
    changeId: change.id,
    recommendationSource: "VENDOR_CHANGE",
    actionType: action.toUpperCase(),
    playbookId: playbookFor(change.vendor, action),
    title: `${change.vendor} ${action} opportunity from ${change.title}`,
    projectedMonthlySavings: baseSavings,
    affectedEntityCount: Math.max(1, Math.round(impact.affectedUsers / Math.max(1, impact.potentialActions.length))),
    governanceRequired: change.impactSeverity === "HIGH" || change.impactSeverity === "CRITICAL" || action === "Migrate",
    trustPrerequisites: ["Vendor announcement validated", "Tenant inventory matched", "Spend exposure calculated"],
    createdAt: now,
  }));
}

function playbookFor(vendor: string, action: string) {
  if (vendor === "MICROSOFT" && action === "Reclaim") return "m365_vendor_change_reclaim";
  if (vendor === "AWS") return "aws_vendor_change_rightsize";
  if (vendor === "SNOWFLAKE") return "snowflake_vendor_change_warehouse_optimization";
  return `${vendor.toLowerCase()}_vendor_change_${action.toLowerCase()}`;
}
