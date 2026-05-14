import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;

router.get("/health", (_req,res)=>res.json({status:"ok"}));
router.get("/readiness", (_req,res)=>res.json({ status:"ready", checks:{ db:"unknown", scheduler:"unknown", connectors:"unknown", env:"validated" } }));
router.get("/startup-report", async (_req,res)=>{ const { startupReport } = await import("../lib/runtime/startup-report"); return res.json(startupReport()); });
