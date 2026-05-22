import { Router } from "express";
import { db, auditEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

interface AuditEntry {
  id: bigint | string | number;
  timestamp: string;
  action: string;
  verdict: string;
  domain?: string;
  certId?: string;
  actorId: string;
}

router.get("/", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const domain = req.query.domain as string | undefined;
    const limitParam = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offsetParam = parseInt(req.query.offset as string) || 0;

    const rows = await db
      .select()
      .from(auditEventsTable)
      .where(eq(auditEventsTable.tenantId, tenantId))
      .orderBy(desc(auditEventsTable.createdAt))
      .limit(limitParam)
      .offset(offsetParam);

    const auditEntries: AuditEntry[] = rows.map((row) => ({
      id: Number(row.id),
      timestamp: row.createdAt.toISOString(),
      action: row.eventType,
      verdict: row.outcome,
      domain: (row.payload as any)?.domain,
      certId: (row.payload as any)?.certId,
      actorId: row.actorId,
    }));

    return res.json(auditEntries);
  } catch (err) {
    req.log.error({ err }, "Error listing audit events");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
