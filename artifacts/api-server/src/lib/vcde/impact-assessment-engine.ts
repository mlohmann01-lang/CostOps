import type { StoredVendorChangeEvent, VendorImpactAssessment } from "./vendor-change-types";

export function assessVendorChangeImpact(change: StoredVendorChangeEvent, tenantId = change.tenantId): VendorImpactAssessment {
  const multiplier = change.impactSeverity === "CRITICAL" ? 0.32 : change.impactSeverity === "HIGH" ? 0.2 : change.impactSeverity === "MEDIUM" ? 0.11 : 0.04;
  const vendorProfiles: Record<string, { users: number; departments: string[]; actions: VendorImpactAssessment["potentialActions"]; evidence: string[] }> = {
    MICROSOFT: { users: 180, departments: ["Sales", "Engineering", "Finance"], actions: ["Reclaim", "Reallocate", "Renegotiate"], evidence: ["M365 assigned licenses", "Copilot usage", "Department spend"] },
    AWS: { users: 42, departments: ["Platform", "Data"], actions: ["Rightsize", "Migrate", "Monitor"], evidence: ["EC2 inventory", "Compute utilisation", "Savings Plan coverage"] },
    SNOWFLAKE: { users: 24, departments: ["Data", "Analytics"], actions: ["Rightsize", "Monitor"], evidence: ["Warehouse telemetry", "Credit consumption", "Query history"] },
    ADOBE: { users: 35, departments: ["Marketing", "Design"], actions: ["Migrate", "Reclaim"], evidence: ["Adobe assignments", "Usage telemetry"] },
  };
  const profile = vendorProfiles[change.vendor] ?? { users: 12, departments: ["IT"], actions: ["Monitor"], evidence: ["Vendor announcement", "Spend inventory"] };
  const monthlyCostDelta = Math.round(change.affectedSpend * multiplier);
  return { changeId: change.id, tenantId, affectedUsers: profile.users, affectedDepartments: profile.departments, affectedSpend: change.affectedSpend, monthlyCostDelta, potentialActions: profile.actions, evidence: [change.sourceUrl, ...profile.evidence], assessedAt: new Date().toISOString() };
}
