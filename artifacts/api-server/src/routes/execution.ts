import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable, outcomeLedgerTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/approve/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });

    const now = new Date();
    const evidence = {
      execution_mode: "MANUAL_APPROVAL_REQUIRED",
      execution_type: "SIMULATED",
      approved_at: now.toISOString(),
      playbook: rec.playbook,
      connector: rec.connector,
      trust_score: rec.trustScore,
      days_since_activity: rec.daysSinceActivity,
      note: "Phase 1: Simulated execution. Real Graph API licence removal in Phase 2.",
    };

    const [outcome] = await db
      .insert(outcomeLedgerTable)
      .values({
        recommendationId: rec.id,
        userEmail: rec.userEmail,
        displayName: rec.displayName,
        action: "licence_reclaim",
        licenceSku: rec.licenceSku,
        beforeCost: rec.monthlyCost,
        afterCost: 0,
        monthlySaving: rec.monthlyCost,
        annualisedSaving: rec.annualisedCost,
        approved: true,
        executed: true,
        executionMode: "MANUAL_APPROVAL_REQUIRED",
        evidence,
        approvedAt: now,
        executedAt: now,
      })
      .returning();

    const [updated] = await db
      .update(recommendationsTable)
      .set({ status: "executed" })
      .where(eq(recommendationsTable.id, id))
      .returning();

    res.json({
      recommendation: {
        id: updated.id,
        userEmail: updated.userEmail,
        displayName: updated.displayName,
        licenceSku: updated.licenceSku,
        monthlyCost: updated.monthlyCost,
        annualisedCost: updated.annualisedCost,
        trustScore: updated.trustScore,
        executionStatus: updated.executionStatus,
        status: updated.status,
        playbook: updated.playbook,
        connector: updated.connector,
        lastActivity: updated.lastActivity ? updated.lastActivity.toISOString() : null,
        daysSinceActivity: updated.daysSinceActivity,
        rejectionReason: updated.rejectionReason,
        createdAt: updated.createdAt.toISOString(),
      },
      outcome: {
        id: outcome.id,
        recommendationId: outcome.recommendationId,
        userEmail: outcome.userEmail,
        displayName: outcome.displayName,
        action: outcome.action,
        licenceSku: outcome.licenceSku,
        beforeCost: outcome.beforeCost,
        afterCost: outcome.afterCost,
        monthlySaving: outcome.monthlySaving,
        annualisedSaving: outcome.annualisedSaving,
        approved: outcome.approved,
        executed: outcome.executed,
        executionMode: outcome.executionMode,
        evidence: outcome.evidence,
        approvedAt: outcome.approvedAt ? outcome.approvedAt.toISOString() : null,
        executedAt: outcome.executedAt ? outcome.executedAt.toISOString() : null,
        createdAt: outcome.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error approving recommendation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reject/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { reason } = req.body as { reason?: string };
  if (!reason) return res.status(400).json({ error: "reason is required" });

  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });

    const [updated] = await db
      .update(recommendationsTable)
      .set({ status: "rejected", rejectionReason: reason })
      .where(eq(recommendationsTable.id, id))
      .returning();

    res.json({
      id: updated.id,
      userEmail: updated.userEmail,
      displayName: updated.displayName,
      licenceSku: updated.licenceSku,
      monthlyCost: updated.monthlyCost,
      annualisedCost: updated.annualisedCost,
      trustScore: updated.trustScore,
      executionStatus: updated.executionStatus,
      status: updated.status,
      playbook: updated.playbook,
      connector: updated.connector,
      lastActivity: updated.lastActivity ? updated.lastActivity.toISOString() : null,
      daysSinceActivity: updated.daysSinceActivity,
      rejectionReason: updated.rejectionReason,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error rejecting recommendation");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
