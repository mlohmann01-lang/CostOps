import { Router } from "express";
import { db } from "@workspace/db";
import { outcomeLedgerTable, outcomeVerificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { buildEconomicProofConsole } from "../lib/outcomes/economic-proof-service";
import { listOutcomeLedger, outcomeLedgerByPlaybook, outcomeLedgerByState, outcomeLedgerSummary } from "../lib/outcomes/outcome-ledger";
import { verifyOutcome } from "../lib/outcomes/outcome-verification-engine";

const router = Router();

function tenantIdFrom(req: any) {
  return String(req.tenantId ?? req.query.tenantId ?? "default");
}

async function getOutcomeForTenant(outcomeId: string, tenantId: string) {
  const numeric = Number(outcomeId);
  const [outcome] = await db.select().from(outcomeLedgerTable).where(and(eq(outcomeLedgerTable.id, numeric), eq(outcomeLedgerTable.tenantId, tenantId))).limit(1);
  return outcome ?? null;
}

async function latestVerification(tenantId: string, outcomeLedgerId: number) {
  const [row] = await db.select().from(outcomeVerificationsTable).where(and(eq(outcomeVerificationsTable.tenantId, tenantId), eq(outcomeVerificationsTable.outcomeLedgerId, outcomeLedgerId))).orderBy(desc(outcomeVerificationsTable.createdAt)).limit(1);
  return row ?? null;
}

function verificationAge(createdAt?: Date | null) {
  if (!createdAt) return null;
  const hours = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 36_000) / 100);
  return { hours, label: hours < 1 ? "just now" : `${hours}h old` };
}


router.get('/ledger', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    const limit = Math.min(parseInt(String(req.query.limit ?? '100')) || 100, 500);
    const rows = await listOutcomeLedger(tenantId, limit);
    return res.json((rows as any[]).map((row) => { const verification = verifyOutcome(row); return { ...row, verificationConfidence: verification.verificationConfidence, verificationStatus: verification.verificationStatus, verifiedMonthlySavings: verification.verifiedMonthlySaving, savingsVariance: verification.varianceAmount, evidencePack: verification.evidencePack, verificationAge: verificationAge(row.executedAt ?? row.createdAt) }; }));
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


router.get('/unverified', async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = await listOutcomeLedger(tenantId, 500);
    const pending = [];
    for (const outcome of rows as any[]) {
      const result = verifyOutcome(outcome);
      if (result.verificationStatus !== 'VERIFIED') pending.push({ ...result, outcome });
    }
    return res.json({ tenantId, count: pending.length, projectedValuePendingProof: pending.reduce((sum, item) => sum + item.projectedMonthlySaving, 0), verificationFailures: pending.filter((item) => item.verificationStatus === 'FAILED').length, outcomes: pending });
  } catch (err) {
    req.log.error({ err }, 'Error listing unverified outcomes');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/evidence', async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const outcome = await getOutcomeForTenant(String(req.params.id), tenantId);
  if (!outcome) return res.status(404).json({ error: 'OUTCOME_NOT_FOUND' });
  const verification = verifyOutcome(outcome);
  return res.json(verification.evidencePack);
});

router.get('/:id/verification', async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const outcome = await getOutcomeForTenant(String(req.params.id), tenantId);
  if (!outcome) return res.status(404).json({ error: 'OUTCOME_NOT_FOUND' });
  const computed = verifyOutcome(outcome);
  const persisted = await latestVerification(tenantId, outcome.id);
  return res.json({ ...computed, persistedVerification: persisted, verificationAge: verificationAge(persisted?.createdAt ?? null) });
});

router.post('/:id/reverify', async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const outcome = await getOutcomeForTenant(String(req.params.id), tenantId);
  if (!outcome) return res.status(404).json({ error: 'OUTCOME_NOT_FOUND' });
  const computed = verifyOutcome(outcome);
  const [record] = await db.insert(outcomeVerificationsTable).values({
    tenantId,
    outcomeLedgerId: outcome.id,
    recommendationId: String(outcome.recommendationId),
    verificationStatus: computed.verificationStatus,
    verificationConfidence: computed.verificationConfidence,
    verificationSource: computed.verificationMethod,
    projectedMonthlySaving: computed.projectedMonthlySaving,
    verifiedMonthlySaving: computed.verifiedMonthlySaving,
    varianceAmount: computed.varianceAmount,
    variancePct: computed.variancePct,
    evidence: computed.evidencePack,
  }).returning();
  return res.status(201).json({ ...computed, persistedVerification: record, verificationAge: verificationAge(record.createdAt) });
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
