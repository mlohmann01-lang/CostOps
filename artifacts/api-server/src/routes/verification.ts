import { Router } from "express";
import { db, outcomeLedgerTable, outcomeVerificationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { verifyOutcome } from "../lib/verification/outcome-verification";

const router = Router();

router.post("/outcomes/:outcomeLedgerId", async (req, res) => {
  const outcomeLedgerId = Number(req.params.outcomeLedgerId);
  const [outcome] = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.id, outcomeLedgerId)).limit(1);
  if (!outcome) return res.status(404).json({ error: "Outcome not found" });
  return res.json(await verifyOutcome(outcome));
});

router.get("/outcomes", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  const rows = await db.select().from(outcomeVerificationsTable).where(eq(outcomeVerificationsTable.tenantId, tenantId)).orderBy(desc(outcomeVerificationsTable.createdAt)).limit(200);
  return res.json(rows);
});

export default router;
