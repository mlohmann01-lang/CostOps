import { Router } from "express";
import { evaluateReadinessAuthority, trustReadinessAuthorityService } from "../lib/trust-readiness/trust-readiness-authority";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

router.get("/actions/:actionId", async (req, res) => {
  const existing = trustReadinessAuthorityService.getReport(tenant(req), req.params.actionId);
  if (existing) return res.json(existing);
  try {
    return res.json(await evaluateReadinessAuthority(tenant(req), req.params.actionId));
  } catch (error) {
    if (error instanceof Error && error.message === "ACTION_NOT_FOUND") return res.status(404).json({ error: "NOT_FOUND" });
    return res.status(500).json({ error: "READINESS_AUTHORITY_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.post("/actions/:actionId/evaluate", async (req, res) => {
  try {
    return res.status(201).json(await evaluateReadinessAuthority(tenant(req), req.params.actionId, req.body ?? {}));
  } catch (error) {
    if (error instanceof Error && error.message === "ACTION_NOT_FOUND") return res.status(404).json({ error: "NOT_FOUND" });
    return res.status(409).json({ error: "READINESS_AUTHORITY_FAILED", message: error instanceof Error ? error.message : String(error) });
  }
});

router.get("/dashboard", (req, res) => res.json(trustReadinessAuthorityService.dashboard(tenant(req))));

export default router;
