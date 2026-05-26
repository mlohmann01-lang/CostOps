import { Router } from "express";
import { db, driftEventsTable, outcomeLedgerTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
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



router.post('/m365/check', async (_req, res) => {
  const events = await db.select().from(driftEventsTable).orderBy(desc(driftEventsTable.createdAt));
  const active = events.filter((e: any) => String(e.status ?? 'OPEN').toUpperCase() === 'OPEN');
  const valueAtRisk = active.reduce((n: number, e: any) => n + Number(e.realizationDelta ?? 0), 0);
  return res.json({ status: 'COMPLETED', summary: { activeDriftEvents: active.length, valueAtRisk, monitoredRecommendations: events.length }, events: active });
});

router.get('/m365/events', async (_req, res) => {
  const events = await db.select().from(driftEventsTable).orderBy(desc(driftEventsTable.createdAt));
  return res.json(events);
});

export default router;
