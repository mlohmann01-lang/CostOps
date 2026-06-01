import type { StoredVendorChangeEvent, VendorImpactAssessment } from "./vendor-change-types";

type Profile = { users: number; departments: string[]; domains: string[]; platforms: string[]; entities: string[]; actions: VendorImpactAssessment["potentialActions"]; evidence: string[]; confidence: "HIGH" | "MEDIUM" | "LOW" };

export function assessVendorChangeImpact(change: StoredVendorChangeEvent, tenantId = change.tenantId, input?: { inventoryAvailable?: boolean }): VendorImpactAssessment {
  const multiplier = change.impactSeverity === "CRITICAL" ? 0.32 : change.impactSeverity === "HIGH" ? 0.2 : change.impactSeverity === "MEDIUM" ? 0.11 : 0.04;
  const vendorProfiles: Record<string, Profile> = {
    MICROSOFT: { users: 180, departments: ["Sales", "Engineering", "Finance"], domains: ["M365"], platforms: ["Microsoft 365", "Copilot"], entities: ["copilot-assigned-users", "m365-ea"], actions: ["Reclaim", "Reallocate", "Renegotiate"], evidence: ["M365 assigned licenses", "Copilot usage", "Department spend"], confidence: "MEDIUM" },
    AWS: { users: 42, departments: ["Platform", "Data"], domains: ["AWS"], platforms: ["EC2", "Savings Plans"], entities: ["aws-edp", "ec2-compute"], actions: ["Rightsize", "Migrate", "Monitor"], evidence: ["EC2 inventory", "Compute utilisation", "Savings Plan coverage"], confidence: "MEDIUM" },
    SNOWFLAKE: { users: 24, departments: ["Data", "Analytics"], domains: ["SNOWFLAKE"], platforms: ["Snowflake Warehouses"], entities: ["snowflake-credits"], actions: ["Rightsize", "Monitor"], evidence: ["Warehouse telemetry", "Credit consumption", "Query history"], confidence: "MEDIUM" },
    ADOBE: { users: 35, departments: ["Marketing", "Design"], domains: ["SAAS"], platforms: ["Adobe Creative Cloud"], entities: ["adobe-enterprise"], actions: ["Migrate", "Reclaim"], evidence: ["Adobe assignments", "Usage telemetry"], confidence: "MEDIUM" },
    SALESFORCE: { users: 55, departments: ["Sales"], domains: ["SAAS"], platforms: ["Salesforce Sales Cloud"], entities: ["salesforce-skus"], actions: ["Reallocate", "Renegotiate"], evidence: ["Salesforce assignments", "CRM usage"], confidence: "MEDIUM" },
  };
  const liveAvailable = input?.inventoryAvailable ?? change.affectedSpend > 0;
  const profile = liveAvailable ? (vendorProfiles[change.vendor] ?? { users: 12, departments: ["IT"], domains: [String(change.vendor)], platforms: [String(change.vendor)], entities: [String(change.vendor).toLowerCase()], actions: ["Monitor"] as VendorImpactAssessment["potentialActions"], evidence: ["Vendor announcement", "Spend inventory"], confidence: "LOW" }) : { users: 0, departments: [], domains: [String(change.vendor)], platforms: [String(change.vendor)], entities: [], actions: ["Monitor"] as VendorImpactAssessment["potentialActions"], evidence: ["Vendor announcement"], confidence: "LOW" as const };
  const monthlyCostDelta = liveAvailable ? Math.round(change.affectedSpend * multiplier) : 0;
  const impactReasons = liveAvailable ? [`${change.vendor} tenant footprint matched to ${profile.platforms.join(", ")}`, `${change.impactSeverity} vendor change severity`] : ["tenant inventory unavailable"];
  return { changeId: change.id, tenantId, affectedUsers: profile.users, affectedDepartments: profile.departments, affectedDomains: profile.domains, affectedPlatforms: profile.platforms, affectedEntities: profile.entities, affectedSpend: change.affectedSpend, monthlyCostDelta, estimatedMonthlyImpact: monthlyCostDelta, estimatedAnnualImpact: monthlyCostDelta * 12, impactConfidence: liveAvailable ? profile.confidence : "LOW", impactReasons, potentialActions: profile.actions, evidence: [change.sourceUrl, ...(change.evidenceRefs ?? []), ...profile.evidence], assessedAt: new Date().toISOString() };
}
