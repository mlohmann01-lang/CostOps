import { Router } from "express";
import { db } from "@workspace/db";
import { outcomeLedgerTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { buildEconomicProofConsole } from "../lib/outcomes/economic-proof-service";
import { listOutcomeLedger, outcomeLedgerByPlaybook, outcomeLedgerByState, outcomeLedgerSummary } from "../lib/outcomes/outcome-ledger";

const router = Router();


router.get('/ledger', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    const limit = Math.min(parseInt(String(req.query.limit ?? '100')) || 100, 500);
    return res.json(await listOutcomeLedger(tenantId, limit));
  } catch (err) {
    req.log.error({ err }, 'Error fetching outcome ledger');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/summary', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    return res.json(await outcomeLedgerSummary(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching ledger summary');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/by-playbook', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    return res.json(await outcomeLedgerByPlaybook(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching ledger by playbook');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/by-state', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    return res.json(await outcomeLedgerByState(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching ledger by state');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/proof-console', async (req,res)=>{
  const tenantId = String(req.query.tenantId ?? 'default');
  return res.json(await buildEconomicProofConsole(tenantId));
});


router.get("/", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const rows = await db
      .select()
      .from(outcomeLedgerTable)
      .orderBy(desc(outcomeLedgerTable.createdAt))
      .limit(limit);
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
    const outcomes = await db.select().from(outcomeLedgerTable);
    const totalMonthlySaving = outcomes.reduce((acc, o) => acc + (o.monthlySaving ?? 0), 0);
    const totalAnnualisedSaving = outcomes.reduce((acc, o) => acc + (o.annualisedSaving ?? 0), 0);
    const totalActionsExecuted = outcomes.length;

    const playbookCounts: Record<string, number> = {};
    for (const o of outcomes) {
      playbookCounts[o.action] = (playbookCounts[o.action] || 0) + 1;
    }
    const topPlaybook =
      Object.entries(playbookCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "INACTIVE_USER_LICENCE_RECLAIM";
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
