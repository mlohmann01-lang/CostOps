import { Router } from "express";
import { ExecutionOrchestrationRepository } from "../lib/execution-orchestration/execution-orchestration.repository";

const router = Router();
const repo = new ExecutionOrchestrationRepository();

function scope(req: any) { return { tenantId: req.headers["x-tenant-id"] ?? "default", actorId: req.headers["x-actor-id"] ?? "system" }; }

router.get("/plans", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.listPlans(String(tenantId))); });
router.get("/plans/:id", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.getPlan(String(tenantId), Number(req.params.id))); });
router.get("/plans/:id/items", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.getPlanItems(String(tenantId), Number(req.params.id))); });
router.get("/plans/:id/events", async (req, res) => { const { tenantId } = scope(req); res.json(await repo.getPlanEvents(String(tenantId), Number(req.params.id))); });
router.get("/queue/status", async (req, res) => { const { tenantId } = scope(req); const ready = await repo.getReadyQueueItems(String(tenantId), 100); res.json({ tenantId, readyCount: ready.length }); });
router.post("/plans/:id/pause", async (_req, res) => res.status(501).json({ error: "pause workflow not yet wired" }));
router.post("/plans/:id/cancel", async (_req, res) => res.status(501).json({ error: "cancel workflow not yet wired" }));

export default router;
