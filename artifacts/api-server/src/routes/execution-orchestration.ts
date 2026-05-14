import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, executionEscalationsTable } from "@workspace/db";
import { ExecutionOrchestrationRepository } from "../lib/execution-orchestration/execution-orchestration.repository";
import { ExecutionQueueService } from "../lib/execution-orchestration/execution-orchestration-service";

const router = Router();
const repo = new ExecutionOrchestrationRepository();
const queueService = new ExecutionQueueService(repo);
function scope(req: any) { return { tenantId: req.headers["x-tenant-id"] ?? "default", actorId: req.headers["x-actor-id"] ?? "system" }; }

router.get("/plans", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.listPlans(String(tenantId))); });
router.get("/plans/:id", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.getPlan(String(tenantId), Number(req.params.id))); });
router.get("/plans/:id/items", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.getPlanItems(String(tenantId), Number(req.params.id))); });
router.get("/plans/:id/events", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.getPlanEvents(String(tenantId), Number(req.params.id))); });
router.get("/queue/status", async (req, res) => { const { tenantId } = scope(req); const ready = await repo.getReadyQueueItems(String(tenantId), 100); res.json({ tenantId, readyCount: ready.length }); });
router.post("/plans/:id/pause", async (_req, res) => res.status(501).json({ error: "pause plan not implemented in execution engine yet" }));
router.post("/plans/:id/resume", async (req, res) => { try { const { tenantId, actorId } = scope(req); const plan = await repo.getPlan(String(tenantId), Number(req.params.id)); if (!plan) return res.status(404).json({ error: "Plan not found" }); return res.json(await queueService.resumePlan(plan, String(actorId))); } catch (e:any) { return res.status(409).json({ error: e.message }); } });
router.post("/plans/:id/cancel", async (_req, res) => res.status(501).json({ error: "cancel plan not implemented in execution engine yet" }));
router.post("/items/:id/retry", async (req, res) => { try { const { tenantId, actorId } = scope(req); return res.json(await queueService.retryQueueItem(String(tenantId), Number(req.params.id), String(actorId))); } catch (e:any) { return res.status(409).json({ error: e.message }); } });
router.post("/items/:id/cancel", async (req, res) => { try { const { tenantId, actorId } = scope(req); return res.json(await queueService.cancelQueueItem(String(tenantId), Number(req.params.id), String(actorId))); } catch (e:any) { return res.status(409).json({ error: e.message }); } });

router.get("/escalations", async (req, res) => { const { tenantId } = scope(req); res.json(await db.select().from(executionEscalationsTable).where(eq(executionEscalationsTable.tenantId, String(tenantId))).orderBy(desc(executionEscalationsTable.createdAt)).limit(500)); });
router.post("/escalations/:id/acknowledge", async (req, res) => { const { tenantId } = scope(req); const [row] = await db.update(executionEscalationsTable).set({ status: "ACKNOWLEDGED", acknowledgedAt: new Date() }).where(and(eq(executionEscalationsTable.tenantId, String(tenantId)), eq(executionEscalationsTable.id, Number(req.params.id)))).returning(); res.json(row ?? { error: "Escalation not found" }); });
router.post("/escalations/:id/resolve", async (req, res) => { const { tenantId } = scope(req); const [row] = await db.update(executionEscalationsTable).set({ status: "RESOLVED", resolvedAt: new Date() }).where(and(eq(executionEscalationsTable.tenantId, String(tenantId)), eq(executionEscalationsTable.id, Number(req.params.id)))).returning(); res.json(row ?? { error: "Escalation not found" }); });

export default router;
