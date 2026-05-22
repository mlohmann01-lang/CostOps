import { Router } from "express";
import { db, executionQueueItemsTable, executionApprovalsTable, recommendationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

interface ExecutionQueueItem {
  id: string | number;
  name: string;
  domain: string;
  approvedBy?: string;
  approvedAt?: string;
  blastRadius: string;
  rollback: boolean;
  status: string;
}

router.get("/", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const status = (req.query.status as string) ?? "PENDING";
    const domain = req.query.domain as string | undefined;

    // Query execution queue items
    const queueItems = await db
      .select()
      .from(executionQueueItemsTable)
      .where(
        and(
          eq(executionQueueItemsTable.tenantId, tenantId),
          eq(executionQueueItemsTable.status, status)
        )
      )
      .orderBy(desc(executionQueueItemsTable.createdAt));

    const result: ExecutionQueueItem[] = [];

    for (const item of queueItems) {
      // Lookup recommendation for name
      const recommendation = item.recommendationId
        ? await db
            .select()
            .from(recommendationsTable)
            .where(eq(recommendationsTable.id, parseInt(item.recommendationId)))
            .then((rows) => rows[0])
        : null;

      // Lookup approval for approver info
      const approval =
        item.approvalStatus !== "NOT_REQUIRED"
          ? await db
              .select()
              .from(executionApprovalsTable)
              .where(
                and(
                  eq(executionApprovalsTable.tenantId, tenantId),
                  eq(executionApprovalsTable.entityId, String(item.id))
                )
              )
              .then((rows) => rows[0])
          : null;

      const approvedByList = approval?.approvedBy as any[] | undefined;
      const approvedBy = approvedByList && approvedByList.length > 0 ? approvedByList[0] : undefined;
      const approvedAtTime = approval?.updatedAt;

      result.push({
        id: item.id,
        name: recommendation?.userEmail ?? recommendation?.displayName ?? `Item ${item.id}`,
        domain: domain ?? "general",
        approvedBy,
        approvedAt: approvedAtTime ? approvedAtTime.toISOString() : undefined,
        blastRadius: item.riskClass ?? "MEDIUM",
        rollback: item.rollbackAvailable ?? false,
        status: item.status,
      });
    }

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing execution queue");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
