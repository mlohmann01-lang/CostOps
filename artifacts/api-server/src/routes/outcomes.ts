import { Router } from "express";
import { db } from "@workspace/db";
import { outcomeLedgerTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const limit = isNaN(limitParam) ? 50 : limitParam;

    const rows = (await db
      .select()
      .from(outcomeLedgerTable)
      .orderBy(desc(outcomeLedgerTable.createdAt))
      .limit(limit)) as any[];

    return res.json(
      rows.map((o: (typeof rows)[number]) => ({
        id: o.id,
        recommendationId: o.recommendationId,
        userEmail: o.userEmail,
        displayName: o.displayName,
        action: o.action,
        licenceSku: o.licenceSku,
        beforeCost: o.beforeCost,
        afterCost: o.afterCost,
        monthlySaving: o.monthlySaving,
        annualisedSaving: o.annualisedSaving,
        approved: o.approved,
        executed: o.executed,
        executionMode: o.executionMode,
        evidence: o.evidence,
        approvedAt: o.approvedAt ? o.approvedAt.toISOString() : null,
        executedAt: o.executedAt ? o.executedAt.toISOString() : null,
        createdAt: o.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing outcomes");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const outcomes = (await db
      .select()
      .from(outcomeLedgerTable)
      .where(eq((outcomeLedgerTable as any).executed, true))) as any[];

    const totalMonthlySaving = outcomes.reduce((acc: number, o) => acc + o.monthlySaving, 0);
    const totalAnnualisedSaving = outcomes.reduce((acc: number, o) => acc + o.annualisedSaving, 0);
    const totalActionsExecuted = outcomes.length;

    const playbookCounts: Record<string, number> = {};
    for (const o of outcomes) {
      playbookCounts[o.action] = (playbookCounts[o.action] || 0) + 1;
    }
    const topPlaybook =
      Object.entries(playbookCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "inactive_user_licence_reclaim";

    const avgMonthlySavingPerAction = totalActionsExecuted > 0 ? totalMonthlySaving / totalActionsExecuted : 0;

    return res.json({
      totalMonthlySaving: Math.round(totalMonthlySaving * 100) / 100,
      totalAnnualisedSaving: Math.round(totalAnnualisedSaving * 100) / 100,
      totalActionsExecuted,
      topPlaybook,
      avgMonthlySavingPerAction: Math.round(avgMonthlySavingPerAction * 100) / 100,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching outcomes summary");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
