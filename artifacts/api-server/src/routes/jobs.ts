import { authMiddleware } from "../middleware/auth";
import { Router } from "express";
import { db, deadLetterJobsTable, jobRunsTable, scheduledJobsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { runJob } from "../lib/jobs/job-runner";
import { calculateNextRun, runDueJobs } from "../lib/jobs/scheduler";

const router = Router();
router.use(authMiddleware);

router.get("/", async (_req, res) => {
  return res.json(await db.select().from(scheduledJobsTable).orderBy(desc(scheduledJobsTable.updatedAt)));
});

router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const cfg = b.scheduleConfig ?? { frequency: "DAILY", hour: 2, minute: 0 };
  const [r] = await db.insert(scheduledJobsTable).values({ tenantId: b.tenantId ?? "default", jobType: b.jobType, jobName: b.jobName ?? b.jobType, enabled: String(b.enabled ?? true), scheduleConfig: cfg, nextRunAt: calculateNextRun(cfg), status: "PENDING" }).returning();
  return res.json(r);
});

router.patch("/:id", async (req, res) => {
  const [r] = await db.update(scheduledJobsTable).set(req.body ?? {}).where(eq(scheduledJobsTable.id, Number(req.params.id))).returning();
  return res.json(r);
});

router.post("/:id/run-now", async (req, res) => {
  const [j] = await db.select().from(scheduledJobsTable).where(eq(scheduledJobsTable.id, Number(req.params.id)));
  if (!j) return res.status(404).json({ error: "not found" });
  const out = await runJob({ tenantId: j.tenantId, jobType: j.jobType, scheduledJobId: j.id, payload: req.body ?? {} });
  return res.json(out);
});

router.get("/runs", async (_req, res) => {
  return res.json(await db.select().from(jobRunsTable).orderBy(desc(jobRunsTable.createdAt)).limit(100));
});
router.get("/dead-letter", async (_req, res) => {
  return res.json(await db.select().from(deadLetterJobsTable).orderBy(desc(deadLetterJobsTable.createdAt)).limit(100));
});
router.post("/run-due", async (_req, res) => {
  return res.json({ results: await runDueJobs() });
});

export default router;
