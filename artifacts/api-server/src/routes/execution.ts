import { Router } from "express";
import { db } from "@workspace/db";
import { recommendationsTable, outcomeLedgerTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { governedExecutionService, type GovernedExecutionType } from "../lib/execution/governed-execution";
import { rollbackM365LicenseExecution, verifyM365Execution } from "../lib/connectors/m365/m365-graph-execution";
import { rollbackServiceNowExecution, verifyServiceNowExecution } from "../lib/connectors/servicenow/servicenow-execution";

const router = Router();

const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const executionBodySchema = z.object({ connectorId: z.string().optional(), executionType: z.enum(["LICENSE_REMOVE", "LICENSE_ASSIGN", "REMOVE_M365_LICENSE", "ASSIGN_M365_LICENSE", "REASSIGN_M365_LICENSE", "RESTORE_M365_LICENSE", "REMOVE_COPILOT_LICENSE", "RESTORE_COPILOT_LICENSE", "DOWNGRADE_M365_LICENSE", "CONVERT_SHARED_MAILBOX_REVIEW", "APPROVE_AI_ASSET", "RETIRE_AI_ASSET", "ASSIGN_AI_OWNER", "ENFORCE_AI_POLICY", "DISABLE_AI_ASSET", "ENABLE_AI_ASSET", "CREATE_SERVICENOW_CHANGE", "UPDATE_SERVICENOW_CHANGE", "CLOSE_SERVICENOW_CHANGE", "CREATE_SERVICENOW_TASK", "UPDATE_SERVICENOW_TASK", "CLOSE_SERVICENOW_TASK", "CREATE_SERVICENOW_APPROVAL", "UPDATE_SERVICENOW_APPROVAL", "WITHDRAW_SERVICENOW_APPROVAL", "VERIFY_SERVICENOW_ARTIFACT", "OWNER_ASSIGN", "AI_ASSET_RETIRE", "AI_ASSET_APPROVE", "TICKET_CREATE", "WORKFLOW_DISABLE", "OTHER"]).default("TICKET_CREATE"), estimatedValue: z.number().optional(), actor: z.string().optional(), approved: z.boolean().optional(), userId: z.string().optional(), skuId: z.string().optional(), targetSkuId: z.string().optional(), dryRun: z.boolean().optional(), ownerId: z.string().optional(), policyId: z.string().optional(), artifactType: z.enum(["CHANGE", "TASK", "APPROVAL"]).optional(), expectedState: z.string().optional(), assignedTo: z.string().optional(), approvalGroup: z.string().optional() });

router.get("/connectors", async (req, res) => res.json(governedExecutionService.listConnectors(tenant(req))));

router.get("/readiness/:actionId", async (req, res) => {
  try {
    const executionType = String(req.query.executionType ?? "TICKET_CREATE") as GovernedExecutionType;
    const readiness = await governedExecutionService.readiness(tenant(req), req.params.actionId, typeof req.query.connectorId === "string" ? req.query.connectorId : undefined, executionType, String(req.query.approved ?? "false") === "true");
    return res.json(readiness);
  } catch (error) {
    return res.status(500).json({ error: "READINESS_EVALUATION_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/dry-run/:actionId", async (req, res) => {
  const parsed = executionBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_DRY_RUN_REQUEST", details: parsed.error.flatten() });
  try {
    const result = await governedExecutionService.simulateExecution({ tenantId: tenant(req), actionId: req.params.actionId, ...parsed.data });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(409).json({ error: "DRY_RUN_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/execute/:actionId", async (req, res) => {
  const parsed = executionBodySchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: "INVALID_EXECUTION_REQUEST", details: parsed.error.flatten() });
  try {
    const result = await governedExecutionService.executeGovernedAction({ tenantId: tenant(req), actionId: req.params.actionId, ...parsed.data });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(409).json({ error: "EXECUTION_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});


router.post("/m365/:executionId/verify", async (req, res) => {
  try {
    const result = await verifyM365Execution(tenant(req), req.params.executionId);
    return res.json(result);
  } catch (error) {
    return res.status(409).json({ error: "M365_VERIFICATION_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/m365/:executionId/rollback", async (req, res) => {
  try {
    const result = await rollbackM365LicenseExecution(tenant(req), req.params.executionId);
    return res.json(result);
  } catch (error) {
    return res.status(409).json({ error: "M365_ROLLBACK_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});


router.post("/servicenow/:executionId/verify", async (req, res) => {
  try {
    const result = await verifyServiceNowExecution(tenant(req), req.params.executionId);
    return res.json(result);
  } catch (error) {
    return res.status(409).json({ error: "SERVICENOW_VERIFICATION_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/servicenow/:executionId/rollback", async (req, res) => {
  try {
    const result = await rollbackServiceNowExecution(tenant(req), req.params.executionId);
    return res.json(result);
  } catch (error) {
    return res.status(409).json({ error: "SERVICENOW_ROLLBACK_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/:executionId/evidence", async (req, res) => res.json(governedExecutionService.listEvidence(tenant(req), req.params.executionId)));

router.get("/:executionId", async (req, res, next) => {
  if (["approve", "reject", "m365", "servicenow"].includes(req.params.executionId)) return next();
  const execution = governedExecutionService.getExecution(tenant(req), req.params.executionId);
  if (!execution) return res.status(404).json({ error: "NOT_FOUND" });
  return res.json(execution);
});


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
