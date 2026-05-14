import { db, discoveredAppsTable, flexeraEntitlementsTable, m365UsersTable, servicenowContractsTable, tenantSkuPricingTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { resolveCanonicalAppIdentity } from "./alias-resolution";
import { inferAppOwner } from "./owner-inference";
import { deriveReadinessBlockers } from "./readiness-blockers";

type DiscoveredAppRow = { tenantId: string; appKey: string; displayName: string; vendor: string; aliases: string[]; sourceSystems: string[]; contractIds: string[]; entitlementCount: number; userCount: number; discoveryConfidence: number; owner?: string | null; department?: string | null; costCenter?: string | null; monthlyCost?: number | null; annualCost?: number | null; ownerConfidence?: number; ownerSource?: string; evidence?: Record<string, unknown> };

export async function discoverApps({ tenantId }: { tenantId: string }) {
  const [m365Users, flexeraEntitlements, serviceNowContracts, tenantPricing] = await Promise.all([
    db.select().from(m365UsersTable).where(eq(m365UsersTable.tenantId, tenantId)),
    db.select().from(flexeraEntitlementsTable).where(eq(flexeraEntitlementsTable.tenantId, tenantId)),
    db.select().from(servicenowContractsTable).where(eq(servicenowContractsTable.tenantId, tenantId)),
    db.select().from(tenantSkuPricingTable).where(eq(tenantSkuPricingTable.tenantId, tenantId)),
  ]);

  const appMap = new Map<string, DiscoveredAppRow>();
  const upsertLocal = (partial: Partial<DiscoveredAppRow> & { appKey: string; displayName: string; vendor: string }) => {
    const existing: DiscoveredAppRow = appMap.get(partial.appKey) ?? { tenantId, appKey: partial.appKey, displayName: partial.displayName, vendor: partial.vendor, aliases: [], sourceSystems: [], contractIds: [], entitlementCount: 0, userCount: 0, discoveryConfidence: 0.7 };
    const merged: DiscoveredAppRow = { ...existing, ...partial, tenantId };
    merged.aliases = Array.from(new Set([...(existing.aliases ?? []), ...(partial.aliases ?? [])]));
    merged.sourceSystems = Array.from(new Set([...(existing.sourceSystems ?? []), ...(partial.sourceSystems ?? [])]));
    merged.contractIds = Array.from(new Set([...(existing.contractIds ?? []), ...(partial.contractIds ?? [])]));
    appMap.set(partial.appKey, merged);
  };

  for (const row of flexeraEntitlements) {
    const resolved = await resolveCanonicalAppIdentity({ tenantId, displayName: row.productName, skuPartNumber: row.skuPartNumber, productName: row.productName, vendor: "Flexera", sourceSystem: "FLEXERA", aliases: [row.skuPartNumber ?? ""].filter(Boolean) });
    upsertLocal({ appKey: resolved.appKey, displayName: resolved.canonicalName, vendor: resolved.canonicalVendor, aliases: resolved.aliases, sourceSystems: ["FLEXERA"], entitlementCount: (appMap.get(resolved.appKey)?.entitlementCount ?? 0) + Math.max(1, row.entitlementQuantity ?? 0) });
  }

  for (const row of serviceNowContracts) {
    const resolved = await resolveCanonicalAppIdentity({ tenantId, displayName: row.productName ?? row.vendor, productName: row.productName, vendor: row.vendor, sourceSystem: "SERVICENOW", aliases: [row.vendor, row.productName ?? ""].filter(Boolean) });
    const owner = inferAppOwner({ serviceNowOwner: row.owner, contractOwner: row.owner });
    upsertLocal({ appKey: resolved.appKey, displayName: resolved.canonicalName, vendor: resolved.canonicalVendor, aliases: resolved.aliases, sourceSystems: ["SERVICENOW"], owner: owner.owner, department: null, costCenter: null, annualCost: row.annualCost, contractIds: [row.contractNumber ?? ""].filter(Boolean), ownerConfidence: owner.confidence, ownerSource: owner.source });
  }

  for (const row of m365Users) {
    for (const sku of (row.assignedLicenses ?? []) as string[]) {
      const resolved = await resolveCanonicalAppIdentity({ tenantId, displayName: sku, skuPartNumber: sku, vendor: "Microsoft", sourceSystem: "M365", aliases: [sku] });
      upsertLocal({ appKey: resolved.appKey, displayName: resolved.canonicalName, vendor: resolved.canonicalVendor, aliases: resolved.aliases, sourceSystems: ["M365"], userCount: (appMap.get(resolved.appKey)?.userCount ?? 0) + 1 });
    }
  }

  for (const row of tenantPricing) {
    const resolved = await resolveCanonicalAppIdentity({ tenantId, displayName: row.skuId, skuPartNumber: row.skuId, vendor: "Microsoft", sourceSystem: "TENANT_PRICING", aliases: [row.skuId] });
    upsertLocal({ appKey: resolved.appKey, displayName: resolved.canonicalName, vendor: resolved.canonicalVendor, sourceSystems: ["TENANT_PRICING"], monthlyCost: row.effectiveMonthlyCost, annualCost: row.effectiveAnnualCost });
  }

  const apps: DiscoveredAppRow[] = Array.from(appMap.values());
  for (const app of apps) {
    const blockerInfo = deriveReadinessBlockers(app);
    await db.insert(discoveredAppsTable).values({ ...app, status: "DISCOVERED", onboardingConfidence: 0, priorityScore: 0, evidence: { ownerConfidence: app.ownerConfidence ?? 0, ownerSource: app.ownerSource ?? "UNKNOWN", blockers: blockerInfo.blockers, recommendedNextActions: blockerInfo.recommendedNextActions } });
  }

  return { apps, mappingsCreated: 0 };
}
