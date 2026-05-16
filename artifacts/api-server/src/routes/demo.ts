import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, executionApprovalsTable, executionBatchesTable, executionOrchestrationPlansTable, executionOutcomeVerificationsTable, recommendationsTable, suppressedRecommendationsTable } from "@workspace/db";

const router = Router();

router.get("/m365-cost-control/status", async (req, res) => {
  const tenantId = String(req.query.tenantId ?? "demo-contoso-retail");
  const tenantName = "Contoso Retail";
  const recommendations = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId));
  const suppressions = await db.select().from(suppressedRecommendationsTable).where(eq(suppressedRecommendationsTable.tenantId, tenantId));
  const plans = await db.select().from(executionOrchestrationPlansTable).where(eq(executionOrchestrationPlansTable.tenantId, tenantId));
  const approvals = await db.select().from(executionApprovalsTable).where(and(eq(executionApprovalsTable.tenantId, tenantId), eq(executionApprovalsTable.approvalStatus, "PENDING")));
  const batches = await db.select().from(executionBatchesTable).where(eq(executionBatchesTable.tenantId, tenantId));
  const verifications = await db.select().from(executionOutcomeVerificationsTable).where(eq(executionOutcomeVerificationsTable.tenantId, tenantId));
  const demoSeededAt = plans[0]?.createdAt?.toISOString?.() ?? null;
  return res.json({ tenantName, recommendationsCount: recommendations.length, suppressionsCount: suppressions.length, orchestrationPlansCount: plans.length, pendingApprovalsCount: approvals.length, batchesCount: batches.length, verificationsCount: verifications.length, savingsProofAvailable: verifications.length > 0, demoSeededAt });
});

export default router;
