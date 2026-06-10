import { Router } from "express";
import { outcomeProtectionService } from "../lib/outcome-protection/outcome-protection";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const send = (res: any, promise: Promise<unknown> | unknown, status = 200) => Promise.resolve(promise).then((value) => res.status(status).json(value)).catch((error) => res.status(409).json({ error: "OUTCOME_PROTECTION_FAILED", message: error instanceof Error ? error.message : String(error) }));

router.get("/dashboard", (req, res) => res.json(outcomeProtectionService.getOutcomeProtectionDashboard(tenant(req))));
router.get("/outcomes", (req, res) => res.json(outcomeProtectionService.listProtectedOutcomes(tenant(req), req.query as any)));
router.get("/outcomes/:id", (req, res) => { const detail = outcomeProtectionService.getProtectedOutcomeDetail(tenant(req), req.params.id); return detail ? res.json(detail) : res.status(404).json({ error: "NOT_FOUND" }); });
router.post("/outcomes", (req, res) => void send(res, outcomeProtectionService.protectOutcome({ ...(req.body ?? {}), tenantId: tenant(req) }), 201));
router.get("/policies", (req, res) => res.json(outcomeProtectionService.listPolicies(tenant(req))));
router.post("/policies", (req, res) => void send(res, outcomeProtectionService.createDriftPolicy({ ...(req.body ?? {}), tenantId: tenant(req) }), 201));
router.post("/outcomes/:id/retention-check", (req, res) => void send(res, outcomeProtectionService.runRetentionCheck(tenant(req), req.params.id), 201));
router.post("/signals", (req, res) => void send(res, outcomeProtectionService.recordDriftSignal({ ...(req.body ?? {}), tenantId: tenant(req) }), 201));
router.post("/findings/:id/remediation", (req, res) => void send(res, outcomeProtectionService.createDriftRemediationAction({ ...(req.body ?? {}), tenantId: tenant(req), driftFindingId: req.params.id }), 201));
router.post("/findings/:id/resolve", (req, res) => void send(res, outcomeProtectionService.resolveDriftFinding({ ...(req.body ?? {}), tenantId: tenant(req), driftFindingId: req.params.id })));

export default router;
