import { Router } from "express";
import { db, reconciliationFindingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { runReconciliation } from "../lib/reconciliation/reconciliation-engine";

const router = Router();

router.post("/run", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const result = await runReconciliation(tenantId);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Reconciliation run failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/findings", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const findings = await db.select().from(reconciliationFindingsTable).where(eq(reconciliationFindingsTable.tenantId, tenantId)).orderBy(desc(reconciliationFindingsTable.createdAt));
    return res.json({ tenantId, findings });
  } catch (err) {
    req.log.error({ err }, "Reconciliation findings fetch failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
