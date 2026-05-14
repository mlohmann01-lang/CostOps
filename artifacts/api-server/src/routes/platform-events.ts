import { Router } from "express";
import { db, platformEventsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
const router = Router();
router.get("/", async (req,res)=>res.json(await db.select().from(platformEventsTable).where(eq(platformEventsTable.tenantId, (req.query.tenantId as string) ?? "default")).orderBy(desc(platformEventsTable.createdAt)).limit(200)));
export default router;
