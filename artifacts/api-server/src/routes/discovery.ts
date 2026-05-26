import { Router } from "express";
import { DiscoveryOrchestrator } from "../lib/discovery-intelligence/services";

const router = Router();
const orchestrator = new DiscoveryOrchestrator();
const runs = new Map<string, { tenantId: string; runId: string; findings: unknown[] }>();

router.post("/runs", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  const result = await orchestrator.run(tenantId, Array.isArray(req.body?.signals) ? req.body.signals : []);
  runs.set(result.runId, { tenantId, runId: result.runId, findings: result.findings });
  res.json(result);
});
router.get("/runs", async (_req, res) => res.json([...runs.values()]));
router.get("/findings", async (_req, res) => res.json([...runs.values()].flatMap((v) => v.findings)));
router.get("/conflicts", async (_req, res) => res.json([]));
router.get("/gaps", async (_req, res) => res.json([]));

export default router;
