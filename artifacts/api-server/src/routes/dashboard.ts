import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable, outcomeLedgerTable, connectorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const outcomes = (await db.select().from(outcomeLedgerTable).where(eq((outcomeLedgerTable as any).executed, true))) as any[];
    const totalMonthlySavings = outcomes.reduce((acc: number, o) => acc + o.monthlySaving, 0);
    const totalAnnualisedSavings = outcomes.reduce((acc: number, o) => acc + o.annualisedSaving, 0);

    const recs = (await db.select().from(recommendationsTable)) as any[];
    const pendingRecommendations = recs.filter((r) => r.status === "pending").length;
    const executedActions = recs.filter((r) => r.status === "executed").length;
    const blockedActions = recs.filter((r) => r.executionStatus === "BLOCKED").length;

    const connectors = (await db.select().from(connectorsTable)) as any[];
    const activeConnectors = connectors.filter((c) => c.status === "connected" || c.status === "syncing").length;
    const avgTrustScore =
      connectors.length > 0 ? connectors.reduce((acc: number, c) => acc + c.trustScore, 0) / connectors.length : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const savingsThisMonth = outcomes
            .filter((o) => o.executedAt && new Date(o.executedAt) >= startOfMonth)
            .reduce((acc: number, o) => acc + o.monthlySaving, 0);

    return res.json({
      totalMonthlySavings: Math.round(totalMonthlySavings * 100) / 100,
      totalAnnualisedSavings: Math.round(totalAnnualisedSavings * 100) / 100,
      pendingRecommendations,
      executedActions,
      blockedActions,
      activeConnectors,
      avgTrustScore: Math.round(avgTrustScore * 100) / 100,
      savingsThisMonth: Math.round(savingsThisMonth * 100) / 100,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/savings-trend", async (req, res) => {
  try {
    const outcomes = (await db.select().from(outcomeLedgerTable).where(eq((outcomeLedgerTable as any).executed, true))) as any[];

    const byMonth: Record<string, { savings: number; actions: number }> = {};
    for (const o of outcomes) {
      if (!o.executedAt) continue;
      const d = new Date(o.executedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = { savings: 0, actions: 0 };
      byMonth[key].savings += o.monthlySaving;
      byMonth[key].actions += 1;
    }

    const trend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        savings: Math.round(data.savings * 100) / 100,
        actions: data.actions,
      }));

    if (trend.length === 0) {
      const months = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];
      trend.push(...months.map((m, i) => ({ month: m, savings: 0, actions: 0 })));
    }

    return res.json(trend);
  } catch (err) {
    req.log.error({ err }, "Error fetching savings trend");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/action-breakdown", async (req, res) => {
  try {
    const recs = (await db.select().from(recommendationsTable)) as any[];

    const groups: Record<string, { count: number; value: number }> = {};
    for (const r of recs) {
      const key = r.executionStatus;
      if (!groups[key]) groups[key] = { count: 0, value: 0 };
      groups[key].count += 1;
      groups[key].value += r.monthlyCost;
    }

    const breakdown = Object.entries(groups).map(([status, data]) => ({
      status,
      count: data.count,
      value: Math.round(data.value * 100) / 100,
    }));

    return res.json(breakdown);
  } catch (err) {
    req.log.error({ err }, "Error fetching action breakdown");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
