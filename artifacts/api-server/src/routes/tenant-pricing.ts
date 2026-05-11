import { Router } from "express";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, pricingDriftEventsTable, pricingEvidenceEventsTable, skuIdentityMapTable, tenantSkuPricingTable, type PricingConfidence } from "@workspace/db";

const router = Router();
const sourceToConfidence = { CONTRACT_IMPORT: "VERIFIED_CONTRACT", INVOICE_IMPORT: "VERIFIED_INVOICE", CSP_IMPORT: "VERIFIED_CSP" } as const;
type ImportSource = keyof typeof sourceToConfidence;
const confidencePriority: PricingConfidence[] = ["VERIFIED_CONTRACT", "VERIFIED_INVOICE", "VERIFIED_CSP", "INFERRED", "PUBLIC_LIST", "UNKNOWN"];
const confidenceRank = (c: string) => Math.max(0, confidencePriority.indexOf(c as PricingConfidence));

router.post("/import", async (req, res) => {
  const { tenantId, source, currency, rows, force = false, actorId = null, canonicalCurrency = "USD" } = req.body ?? {};
  if (!tenantId || !source || !currency || !Array.isArray(rows)) return res.status(400).json({ error: "tenantId, source, currency and rows are required" });
  if (!(source in sourceToConfidence)) return res.status(400).json({ error: "Invalid source" });

  const now = new Date();
  const importConfidence = sourceToConfidence[source as ImportSource];
  let imported = 0; let skipped = 0;

  for (const [i, row] of rows.entries()) {
    const skuId = row?.skuId ?? row?.skuPartNumber;
    const monthly = Number(row?.effectiveMonthlyCost); const annual = Number(row?.effectiveAnnualCost);
    const fxRate = Number(row?.fxRate ?? 1);
    if (!skuId || !Number.isFinite(monthly) || monthly <= 0 || !Number.isFinite(annual) || annual <= 0) continue;

    const [bestExisting] = await db.select().from(tenantSkuPricingTable)
      .where(and(eq(tenantSkuPricingTable.tenantId, tenantId), eq(tenantSkuPricingTable.skuId, skuId), lte(tenantSkuPricingTable.contractStart, now), or(isNull(tenantSkuPricingTable.contractEnd), gte(tenantSkuPricingTable.contractEnd, now))))
      .orderBy(desc(tenantSkuPricingTable.lastValidated));
    if (bestExisting && confidenceRank(bestExisting.pricingConfidence) < confidenceRank(importConfidence) && !force) {
      skipped += 1;
      await db.insert(pricingEvidenceEventsTable).values({ tenantId, skuId, skuPartNumber: row?.skuPartNumber ?? null, evidenceSource: "MANUAL_IMPORT", pricingSource: source, pricingConfidence: importConfidence, effectiveMonthlyCost: monthly, effectiveAnnualCost: annual, currency: canonicalCurrency, action: "SKIPPED_LOWER_CONFIDENCE", reason: "Higher-confidence pricing evidence already exists", evidenceMetadata: { rowIndex: i }, actorId });
      continue;
    }

    const values = {
      tenantId, skuId, canonicalSkuId: row?.canonicalSkuId ?? skuId, skuAliases: Array.isArray(row?.skuAliases) ? row.skuAliases : [],
      pricingSource: source, pricingConfidence: importConfidence, currency: canonicalCurrency,
      originalCurrency: currency, originalMonthlyCost: monthly, originalAnnualCost: annual,
      fxRateUsed: Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1, fxRateSource: row?.fxRateSource ?? "MANUAL", fxTimestamp: now,
      effectiveMonthlyCost: monthly * (Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1),
      effectiveAnnualCost: annual * (Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1),
      evidenceSource: "MANUAL_IMPORT", evidenceId: null, evidenceMetadata: { rowIndex: i, importedAt: now.toISOString() },
      derivedFrom: row?.derivedFrom ?? "", contractStart: row?.contractStart ? new Date(row.contractStart) : null, contractEnd: row?.contractEnd ? new Date(row.contractEnd) : null,
      approvalRequired: confidenceRank(importConfidence) > confidenceRank(bestExisting?.pricingConfidence ?? "UNKNOWN") && !force ? "true" : "false", approvedBy: force ? actorId : null, lastValidated: now,
    };

    await db.insert(tenantSkuPricingTable).values(values);
    await db.insert(pricingEvidenceEventsTable).values({ tenantId, skuId, skuPartNumber: row?.skuPartNumber ?? null, evidenceSource: "MANUAL_IMPORT", pricingSource: source, pricingConfidence: importConfidence, effectiveMonthlyCost: values.effectiveMonthlyCost, effectiveAnnualCost: values.effectiveAnnualCost, currency: canonicalCurrency, action: "CREATED", reason: "Pricing evidence row created", evidenceMetadata: values.evidenceMetadata, newValue: values, actorId });
    imported += 1;
  }

  return res.json({ imported, skipped });
});

router.post("/drift/detect", async (req, res) => {
  const { tenantId } = req.body ?? {};
  if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
  const now = new Date();
  const rows = await db.select().from(tenantSkuPricingTable).where(eq(tenantSkuPricingTable.tenantId, tenantId));
  let generated = 0;
  for (const row of rows) if (row.contractEnd && row.contractEnd < now) { generated += 1; await db.insert(pricingDriftEventsTable).values({ tenantId, skuId: row.skuId, eventType: "CONTRACT_EXPIRED", severity: "HIGH", reason: "Contract expired", priorState: {}, currentState: { contractEnd: row.contractEnd.toISOString() }, detectedAt: now }); }
  return res.json({ generated });
});

router.get("/sku-map/:tenantId", async (_req, res) => res.json(await db.select().from(skuIdentityMapTable).limit(500)));
router.get("/events", async (req, res) => res.json(await db.select().from(pricingEvidenceEventsTable).where(eq(pricingEvidenceEventsTable.tenantId, req.query.tenantId as string)).orderBy(desc(pricingEvidenceEventsTable.createdAt)).limit(200)));
router.get("/:tenantId", async (req, res) => res.json(await db.select().from(tenantSkuPricingTable).where(eq(tenantSkuPricingTable.tenantId, req.params.tenantId)).orderBy(desc(tenantSkuPricingTable.lastValidated))));

export default router;
