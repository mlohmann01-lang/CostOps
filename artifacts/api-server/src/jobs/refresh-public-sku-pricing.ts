import { db, m365SkuCatalogTable } from "@workspace/db";

export async function refreshPublicSkuPricing(rows: Array<{ skuId: string; skuPartNumber: string; productName: string; currency: string; region: string; listPriceMonthly: number; listPriceAnnual: number; source?: string }>) {
  const now = new Date();
  for (const row of rows) {
    await db.insert(m365SkuCatalogTable).values({
      ...row,
      source: row.source ?? "PUBLIC",
      servicePlans: [],
      effectiveFrom: now,
      effectiveTo: null,
      lastUpdated: now,
    });
  }
  return { updated: rows.length, updatedAt: now.toISOString() };
}
