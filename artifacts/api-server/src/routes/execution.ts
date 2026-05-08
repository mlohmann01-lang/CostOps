import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable, outcomeLedgerTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runExecutionEngine } from "../lib/execution/execution-engine";
import { createLedgerEntry } from "../lib/outcome-ledger/create-ledger-entry";
import { assertNotAlreadyExecuted } from "../lib/execution/idempotency";

const router = Router();

router.post("/approve/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });
    if (rec.status !== "pending") return res.status(400).json({ error: "Recommendation is not pending" });

    const actorId = req.body?.actorId as string | undefined;
    const tenantId = (req.body?.tenantId as string | undefined) ?? "default";

    const engineResult = await runExecutionEngine({ recommendation: rec, actorId, tenantId, mode: "APPROVAL_EXECUTE", mvpMode: true });
    if (!engineResult.allowed) return res.status(400).json(engineResult);

    const action = "REMOVE_LICENSE";
    const idempotencyCheck = await assertNotAlreadyExecuted(String(rec.id), action);
    if (!idempotencyCheck.allowed) {
      return res.status(409).json({
        error: "DUPLICATE_EXECUTION",
        duplicateExecution: true,
        idempotencyKey: idempotencyCheck.idempotencyKey,
        existingExecution: idempotencyCheck.existing,
      });
    }
    const trustSnapshot = {
      entity_trust_score: rec.entityTrustScore,
      recommendation_trust_score: rec.recommendationTrustScore,
      execution_readiness_score: rec.executionReadinessScore,
      execution_gate: rec.executionStatus,
      critical_blockers: rec.criticalBlockers,
      warnings: rec.warnings,
      score_breakdown: rec.scoreBreakdown,
    };

    const ledgerEntry = createLedgerEntry({
      tenantId: "default",
      recommendation: rec,
      recommendationId: String(rec.id),
      action,
      idempotencyKey: idempotencyCheck.idempotencyKey,
      trustSnapshot,
      actionRiskProfile: engineResult.actionRiskProfile,
      beforeState: { hasLicense: true, licenceSku: rec.licenceSku, monthlyCost: rec.monthlyCost },
      afterState: { hasLicense: false, licenceSku: null, monthlyCost: 0 },
      dryRunResult: engineResult.dryRunResult,
      executionEvidence: { ...engineResult.evidence, authorizationResult: engineResult.evidence.authorizationResult },
      actorId: actorId ?? "",
      executionMode: "APPROVAL_EXECUTE",
      executionStatus: "EXECUTED",
    });

    const [outcome] = await db.insert(outcomeLedgerTable).values(ledgerEntry).returning();

    const [updated] = await db.update(recommendationsTable).set({ status: "executed" }).where(eq(recommendationsTable.id, id)).returning();
    res.json({ recommendation: updated, outcome, engineResult });
  } catch (err) {
    req.log.error({ err }, "Error approving recommendation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/dry-run/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, id));
  if (!rec) return res.status(404).json({ error: "Recommendation not found" });
  const actorId = req.body?.actorId as string | undefined;
  const tenantId = (req.body?.tenantId as string | undefined) ?? "default";
  const engineResult = await runExecutionEngine({ recommendation: rec, actorId, tenantId, mode: "DRY_RUN", mvpMode: true });
  return res.json(engineResult);
});

export default router;
