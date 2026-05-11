import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, m365SkuCatalogTable, pricingDriftEventsTable, tenantSkuPricingTable, type PricingConfidence } from "@workspace/db";

const priority: PricingConfidence[] = ["VERIFIED_CONTRACT", "VERIFIED_INVOICE", "VERIFIED_CSP", "INFERRED", "PUBLIC_LIST", "UNKNOWN"];

function confidenceRank(confidence: string): number {
  const idx = priority.indexOf(confidence as PricingConfidence);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function degradeConfidence(confidence: string): PricingConfidence {
  const idx = confidenceRank(confidence);
  if (idx >= priority.length - 1) return "UNKNOWN";
  return priority[idx + 1] as PricingConfidence;
}

export async function resolveSkuPrice(tenantId: string, skuId: string) {
  const now = new Date();
  const tenantRows = await db.select().from(tenantSkuPricingTable)
    .where(and(eq(tenantSkuPricingTable.tenantId, tenantId), eq(tenantSkuPricingTable.skuId, skuId)))
    .orderBy(desc(tenantSkuPricingTable.lastValidated));

  const activeRows = tenantRows.filter((r: any) => (!r.contractStart || r.contractStart <= now) && (!r.contractEnd || r.contractEnd >= now));
  const conflicting = activeRows.length > 1 && new Set(activeRows.map((r: any) => r.effectiveMonthlyCost)).size > 1;

  const bestTenant = activeRows.sort((a: any, b: any) => confidenceRank(a.pricingConfidence) - confidenceRank(b.pricingConfidence))[0];
  if (bestTenant) {
    let resolvedConfidence = bestTenant.pricingConfidence as PricingConfidence;
    if (conflicting) resolvedConfidence = degradeConfidence(resolvedConfidence);

    if (bestTenant.contractEnd && bestTenant.contractEnd < now) {
      resolvedConfidence = degradeConfidence(resolvedConfidence);
    }

    return {
      monthly: bestTenant.effectiveMonthlyCost,
      annual: bestTenant.effectiveAnnualCost,
      currency: bestTenant.currency,
      pricingConfidence: resolvedConfidence,
      pricingSource: bestTenant.pricingSource,
      pricingConflictState: conflicting ? "CONFLICT" : "NONE",
      pricingFreshness: bestTenant.lastValidated,
      fxRateUsed: bestTenant.fxRateUsed,
      originalCurrency: bestTenant.originalCurrency,
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
      pricingConflictState: "NONE",
      pricingFreshness: publicRow.lastUpdated,
      fxRateUsed: 1,
      originalCurrency: publicRow.currency,
    };
  }

  return { monthly: 0, annual: 0, currency: "USD", pricingConfidence: "UNKNOWN", pricingSource: "", pricingConflictState: "MISSING", pricingFreshness: null, fxRateUsed: 1, originalCurrency: "USD" };
}

export async function resolveProjectedSavings(tenantId: string, skuId: string, quantity: number) {
  const unit = await resolveSkuPrice(tenantId, skuId);
  return {
    projectedMonthlySaving: unit.monthly * quantity,
    projectedAnnualSaving: unit.annual * quantity,
    pricingConfidence: unit.pricingConfidence,
    pricingSource: unit.pricingSource,
    pricingFreshness: unit.pricingFreshness,
    pricingConflictState: unit.pricingConflictState,
    currency: unit.currency,
    warning: unit.pricingConfidence === "UNKNOWN" ? "No pricing available; recommendation uses unknown savings confidence" : undefined,
  };
}

export async function detectPricingDriftForTenant(tenantId: string) {
  const now = new Date();
  const tenantRows = await db.select().from(tenantSkuPricingTable).where(eq(tenantSkuPricingTable.tenantId, tenantId));
  const events: Array<{ skuId: string; eventType: string; reason: string }> = [];

  for (const row of tenantRows) {
    if (row.contractEnd && row.contractEnd < now) {
      events.push({ skuId: row.skuId, eventType: "CONTRACT_EXPIRED", reason: "Contract pricing window expired" });
    }
    const ageMs = now.getTime() - row.lastValidated.getTime();
    if (ageMs > 1000 * 60 * 60 * 24 * 45) {
      events.push({ skuId: row.skuId, eventType: "STALE_PRICING", reason: "Pricing evidence older than 45 days" });
    }
  }

  for (const event of events) {
    await db.insert(pricingDriftEventsTable).values({
      tenantId,
      skuId: event.skuId,
      eventType: event.eventType,
      severity: event.eventType === "CONTRACT_EXPIRED" ? "HIGH" : "MEDIUM",
      reason: event.reason,
      priorState: {},
      currentState: { detectedAt: now.toISOString() },
      detectedAt: now,
    });
  }

  return { generated: events.length };
}
