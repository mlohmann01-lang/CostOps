import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable, outcomeLedgerTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(outcomeLedgerTable)
      .orderBy(desc(outcomeLedgerTable.createdAt))
      .limit(100);
    return res.json(
      rows.map((o) => ({
        id: o.id,
        recommendationId: o.recommendationId,
        userEmail: o.userEmail,
        displayName: o.displayName,
        action: o.action,
        licenceSku: o.licenceSku,
        monthlySaving: o.monthlySaving,
        annualisedSaving: o.annualisedSaving,
        executionMode: o.executionMode,
        executedAt: o.executedAt ? o.executedAt.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing execution events");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/approve/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });

    const [updated] = await db
      .update(recommendationsTable)
      .set({ status: "executed" })
      .where(eq(recommendationsTable.id, id))
      .returning();

    const [outcome] = await db
      .insert(outcomeLedgerTable)
      .values({
        recommendationId: rec.id,
        userEmail: rec.userEmail,
        displayName: rec.displayName,
        action: "REMOVE_LICENSE",
        licenceSku: rec.licenceSku,
        beforeCost: rec.monthlyCost,
        afterCost: 0,
        monthlySaving: rec.monthlyCost,
        annualisedSaving: rec.annualisedCost,
        approved: true,
        executed: true,
        executionMode: "SIMULATED",
        evidence: { trustScore: rec.trustScore, executionStatus: rec.executionStatus },
        approvedAt: new Date(),
        executedAt: new Date(),
      })
      .returning();

    return res.json({ recommendation: updated, outcome });
  } catch (err) {
    req.log.error({ err }, "Error approving recommendation");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reject/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });

    const reason = req.body?.reason as string | undefined;
    const [updated] = await db
      .update(recommendationsTable)
      .set({ status: "rejected", rejectionReason: reason ?? null })
      .where(eq(recommendationsTable.id, id))
      .returning();

    return res.json({ recommendation: updated });
  } catch (err) {
    req.log.error({ err }, "Error rejecting recommendation");
    return res.status(500).json({ error: "Internal server error" });
  }
});



router.post('/m365/dry-run', async (req, res) => {
  try {
    const recommendationId = Number(req.body?.recommendationId);
    if (!recommendationId) return res.status(400).json({ error: 'recommendationId is required' });
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, recommendationId));
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    const projectedMonthlySavings = Number(rec.monthlyCost ?? 0);
    const projectedAnnualSavings = Number(rec.annualisedCost ?? projectedMonthlySavings * 12);
    const [outcome] = await db.insert(outcomeLedgerTable).values({
      recommendationId: rec.id,
      userEmail: rec.userEmail,
      displayName: rec.displayName,
      action: 'DRY_RUN_ONLY',
      licenceSku: rec.licenceSku,
      beforeCost: rec.monthlyCost,
      afterCost: rec.monthlyCost,
      monthlySaving: projectedMonthlySavings,
      annualisedSaving: projectedAnnualSavings,
      approved: false,
      executed: false,
      executionMode: 'DRY_RUN_ONLY',
      evidence: { summary: 'Dry-run completed. No production changes were made.' },
    }).returning();
    return res.json({ status: 'DRY_RUN_COMPLETED', recordId: String(outcome.id), recommendationId: String(rec.id), summary: 'Dry-run completed. No production changes were made.', projectedMonthlySavings, projectedAnnualSavings, warnings: [], blockers: [] });
  } catch (err) {
    return res.status(500).json({ error: 'DRY_RUN_FAILED' });
  }
});

export default router;
