import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, m365SkuCatalogTable, tenantSkuPricingTable, type PricingConfidence } from "@workspace/db";

const priority: PricingConfidence[] = ["VERIFIED_CONTRACT", "VERIFIED_INVOICE", "VERIFIED_CSP", "INFERRED", "PUBLIC_LIST", "UNKNOWN"];

export async function resolveSkuPrice(tenantId: string, skuId: string) {
  const now = new Date();
  const tenantRows = await db.select().from(tenantSkuPricingTable)
    .where(and(eq(tenantSkuPricingTable.tenantId, tenantId), eq(tenantSkuPricingTable.skuId, skuId), lte(tenantSkuPricingTable.contractStart, now), or(isNull(tenantSkuPricingTable.contractEnd), gte(tenantSkuPricingTable.contractEnd, now))))
    .orderBy(desc(tenantSkuPricingTable.lastValidated));

  const bestTenant = tenantRows.sort((a: any, b: any) => priority.indexOf(a.pricingConfidence as PricingConfidence) - priority.indexOf(b.pricingConfidence as PricingConfidence))[0];
  if (bestTenant) {
    return {
      monthly: bestTenant.effectiveMonthlyCost,
      annual: bestTenant.effectiveAnnualCost,
      currency: bestTenant.currency,
      pricingConfidence: bestTenant.pricingConfidence,
      pricingSource: bestTenant.pricingSource,
    };
  }

  const [publicRow] = await db.select().from(m365SkuCatalogTable)
    .where(and(eq(m365SkuCatalogTable.skuId, skuId), lte(m365SkuCatalogTable.effectiveFrom, now), or(isNull(m365SkuCatalogTable.effectiveTo), gte(m365SkuCatalogTable.effectiveTo, now))))
    .orderBy(desc(m365SkuCatalogTable.effectiveFrom)).limit(1);

  if (publicRow) {
    return {
      monthly: publicRow.listPriceMonthly,
      annual: publicRow.listPriceAnnual,
      currency: publicRow.currency,
      pricingConfidence: "PUBLIC_LIST",
      pricingSource: publicRow.source,
    };
  }

  return { monthly: 0, annual: 0, currency: "USD", pricingConfidence: "UNKNOWN", pricingSource: "" };
}

export async function resolveProjectedSavings(tenantId: string, skuId: string, quantity: number) {
  const unit = await resolveSkuPrice(tenantId, skuId);
  return {
    projectedMonthlySaving: unit.monthly * quantity,
    projectedAnnualSaving: unit.annual * quantity,
    pricingConfidence: unit.pricingConfidence,
    pricingSource: unit.pricingSource,
    currency: unit.currency,
    warning: unit.pricingConfidence === "UNKNOWN" ? "No pricing available; recommendation uses unknown savings confidence" : undefined,
  };
}
