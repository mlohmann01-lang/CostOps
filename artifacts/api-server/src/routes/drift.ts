import { Router } from "express";
import { db, driftEventsTable, outcomeLedgerTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { runM365BetaDriftCheck } from "../lib/monitoring/m365-beta-drift";
import { checkM365LicenceReclaimDrift } from "../lib/monitoring/drift-monitor";

const router = Router();

router.post("/check/:outcomeLedgerId", async (req, res) => {
  const outcomeLedgerId = Number(req.params.outcomeLedgerId);
  if (Number.isNaN(outcomeLedgerId)) return res.status(400).json({ error: "Invalid outcomeLedgerId" });

  const [outcome] = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.id, outcomeLedgerId));
  if (!outcome) return res.status(404).json({ error: "Outcome not found" });

  const event = await checkM365LicenceReclaimDrift(outcome);
  return res.json({ outcomeLedgerId, event: event[0] });
});

router.get("/events", async (_req, res) => {
  const events = await db.select().from(driftEventsTable).orderBy(desc(driftEventsTable.createdAt));
  return res.json(events);
});



router.post('/m365/check', async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? 'default';
  return res.json(await runM365BetaDriftCheck(tenantId));
});

router.get('/m365/events', async (_req, res) => {
  const events = await db.select().from(driftEventsTable).orderBy(desc(driftEventsTable.createdAt));
  return res.json(events);
});

export default router;
