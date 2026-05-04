import { Router } from "express";
import { db } from "@workspace/db";
import { connectorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const connectors = await db.select().from(connectorsTable).orderBy(connectorsTable.id);
    res.json(
      connectors.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        lastSync: c.lastSync ? c.lastSync.toISOString() : null,
        recordCount: c.recordCount,
        trustScore: c.trustScore,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing connectors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/sync", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [connector] = await db.select().from(connectorsTable).where(eq(connectorsTable.id, id));
    if (!connector) return res.status(404).json({ error: "Connector not found" });

    await db
      .update(connectorsTable)
      .set({ status: "syncing", lastSync: new Date() })
      .where(eq(connectorsTable.id, id));

    setTimeout(async () => {
      await db
        .update(connectorsTable)
        .set({ status: "connected", recordCount: connector.recordCount + Math.floor(Math.random() * 10) })
        .where(eq(connectorsTable.id, id));
    }, 3000);

    const [updated] = await db.select().from(connectorsTable).where(eq(connectorsTable.id, id));
    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      status: updated.status,
      lastSync: updated.lastSync ? updated.lastSync.toISOString() : null,
      recordCount: updated.recordCount,
      trustScore: updated.trustScore,
    });
  } catch (err) {
    req.log.error({ err }, "Error syncing connector");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
