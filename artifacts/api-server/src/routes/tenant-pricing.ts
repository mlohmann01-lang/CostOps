import { Router } from "express";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db, pricingEvidenceEventsTable, tenantSkuPricingTable, type PricingConfidence } from "@workspace/db";

const router = Router();

const sourceToConfidence = {
  CONTRACT_IMPORT: "VERIFIED_CONTRACT",
  INVOICE_IMPORT: "VERIFIED_INVOICE",
  CSP_IMPORT: "VERIFIED_CSP",
} as const;

type ImportSource = keyof typeof sourceToConfidence;

const confidencePriority: PricingConfidence[] = ["VERIFIED_CONTRACT", "VERIFIED_INVOICE", "VERIFIED_CSP", "INFERRED", "PUBLIC_LIST", "UNKNOWN"];

function confidenceRank(confidence: string) {
  const idx = confidencePriority.indexOf(confidence as PricingConfidence);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

router.post("/import", async (req, res) => {
  const { tenantId, source, currency, rows, force = false, actorId = null } = req.body ?? {};
  if (!tenantId || !source || !currency || !Array.isArray(rows)) {
    return res.status(400).json({ error: "tenantId, source, currency and rows are required" });
  }

  if (!(source in sourceToConfidence)) {
    return res.status(400).json({ error: "Invalid source" });
  }

  const now = new Date();
  const importConfidence = sourceToConfidence[source as ImportSource];
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const skuId = row?.skuId ?? row?.skuPartNumber;
    const monthly = Number(row?.effectiveMonthlyCost);
    const annual = Number(row?.effectiveAnnualCost);

    if (!skuId) {
      const reason = "skuId or skuPartNumber is required";
      errors.push({ index: i, message: reason });
      await db.insert(pricingEvidenceEventsTable).values({
        tenantId,
        skuId: row?.skuId ?? row?.skuPartNumber ?? "UNKNOWN",
        skuPartNumber: row?.skuPartNumber ?? null,
        evidenceSource: "MANUAL_IMPORT",
        pricingSource: source,
        pricingConfidence: importConfidence,
        effectiveMonthlyCost: Number.isFinite(monthly) ? monthly : 0,
        effectiveAnnualCost: Number.isFinite(annual) ? annual : 0,
        currency,
        action: "REJECTED_INVALID",
        reason,
        evidenceId: null,
        evidenceMetadata: { importSource: source, importedAt: now.toISOString(), force: Boolean(force), rowIndex: i, derivedFrom: row?.derivedFrom ?? "" },
        previousValue: null,
        newValue: row ?? null,
        actorId,
      });
      continue;
    }
    if (!Number.isFinite(monthly) || monthly <= 0 || !Number.isFinite(annual) || annual <= 0) {
      const reason = "effectiveMonthlyCost and effectiveAnnualCost must be positive numbers";
      errors.push({ index: i, message: reason });
      await db.insert(pricingEvidenceEventsTable).values({
        tenantId, skuId, skuPartNumber: row?.skuPartNumber ?? null, evidenceSource: "MANUAL_IMPORT", pricingSource: source, pricingConfidence: importConfidence,
        effectiveMonthlyCost: Number.isFinite(monthly) ? monthly : 0, effectiveAnnualCost: Number.isFinite(annual) ? annual : 0, currency,
        action: "REJECTED_INVALID", reason, evidenceId: null,
        evidenceMetadata: { importSource: source, importedAt: now.toISOString(), force: Boolean(force), rowIndex: i, derivedFrom: row?.derivedFrom ?? "" },
        previousValue: null, newValue: row ?? null, actorId,
      });
      continue;
    }

    const [bestExisting] = await db.select().from(tenantSkuPricingTable)
      .where(and(eq(tenantSkuPricingTable.tenantId, tenantId), eq(tenantSkuPricingTable.skuId, skuId), lte(tenantSkuPricingTable.contractStart, now), or(isNull(tenantSkuPricingTable.contractEnd), gte(tenantSkuPricingTable.contractEnd, now))))
      .orderBy(desc(tenantSkuPricingTable.lastValidated));

    if (bestExisting && confidenceRank(bestExisting.pricingConfidence) < confidenceRank(importConfidence) && !force) {
      skipped += 1;
      await db.insert(pricingEvidenceEventsTable).values({
        tenantId, skuId, skuPartNumber: row?.skuPartNumber ?? null, evidenceSource: "MANUAL_IMPORT", pricingSource: source, pricingConfidence: importConfidence,
        effectiveMonthlyCost: monthly, effectiveAnnualCost: annual, currency,
        action: "SKIPPED_LOWER_CONFIDENCE", reason: "Higher-confidence pricing evidence already exists", evidenceId: null,
        evidenceMetadata: { importSource: source, importedAt: now.toISOString(), force: Boolean(force), rowIndex: i, derivedFrom: row?.derivedFrom ?? "" },
        previousValue: bestExisting, newValue: row ?? null, actorId,
      });
      continue;
    }

    const [existingRow] = await db.select().from(tenantSkuPricingTable)
      .where(and(eq(tenantSkuPricingTable.tenantId, tenantId), eq(tenantSkuPricingTable.skuId, skuId), eq(tenantSkuPricingTable.pricingSource, source)))
      .limit(1);

    const values = {
      evidenceSource: "MANUAL_IMPORT",
      evidenceId: null,
      evidenceMetadata: { importSource: source, importedAt: now.toISOString(), force: Boolean(force), rowIndex: i, derivedFrom: row?.derivedFrom ?? "" },
      tenantId,
      skuId,
      pricingSource: source,
      pricingConfidence: importConfidence,
      currency,
      effectiveMonthlyCost: monthly,
      effectiveAnnualCost: annual,
      derivedFrom: row?.derivedFrom ?? "",
      contractStart: row?.contractStart ? new Date(row.contractStart) : null,
      contractEnd: row?.contractEnd ? new Date(row.contractEnd) : null,
      lastValidated: now,
    };

    if (existingRow) {
      await db.update(tenantSkuPricingTable).set(values).where(eq(tenantSkuPricingTable.id, existingRow.id));
      await db.insert(pricingEvidenceEventsTable).values({
        tenantId, skuId, skuPartNumber: row?.skuPartNumber ?? null, evidenceSource: "MANUAL_IMPORT", pricingSource: source, pricingConfidence: importConfidence,
        effectiveMonthlyCost: monthly, effectiveAnnualCost: annual, currency,
        action: "UPDATED", reason: "Pricing evidence row updated", evidenceId: null,
        evidenceMetadata: values.evidenceMetadata, previousValue: existingRow, newValue: values, actorId,
      });
    } else {
      await db.insert(tenantSkuPricingTable).values(values);
      await db.insert(pricingEvidenceEventsTable).values({
        tenantId, skuId, skuPartNumber: row?.skuPartNumber ?? null, evidenceSource: "MANUAL_IMPORT", pricingSource: source, pricingConfidence: importConfidence,
        effectiveMonthlyCost: monthly, effectiveAnnualCost: annual, currency,
        action: "CREATED", reason: "Pricing evidence row created", evidenceId: null,
        evidenceMetadata: values.evidenceMetadata, previousValue: null, newValue: values, actorId,
      });
    }
    imported += 1;
  }

  return res.json({ imported, skipped, errors });
});

router.get("/events", async (req, res) => {
  const tenantId = req.query.tenantId as string;
  if (!tenantId) return res.status(400).json({ error: "tenantId query parameter is required" });
  const events = await db.select().from(pricingEvidenceEventsTable)
    .where(eq(pricingEvidenceEventsTable.tenantId, tenantId))
    .orderBy(desc(pricingEvidenceEventsTable.createdAt))
    .limit(200);
  return res.json(events);
});

router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const rows = await db.select().from(tenantSkuPricingTable)
    .where(eq(tenantSkuPricingTable.tenantId, tenantId))
    .orderBy(desc(tenantSkuPricingTable.lastValidated));
  return res.json(rows);
});

export default router;
