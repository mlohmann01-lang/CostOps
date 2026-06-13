import { Router } from "express";
import { requireTenantContext } from "../middleware/security-guards";
import { classifyProductionError, requireRole, type CertenRole } from "../lib/runtime/live-tenant-safety";
import {
  generateExecutiveProofPack,
  getExecutiveProofPack,
  listExecutiveProofPacks,
  archiveExecutiveProofPack,
  markExecutiveProofPackExported,
  evaluateExecutiveProofPackExportReadiness,
  getExecutiveProofPackAuthoritySummary,
  type ExecutiveProofPackType,
} from "../lib/proof-pack-authority/executive-proof-pack-authority";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const roles = (req: any): CertenRole[] => String(req.header("x-certen-role") ?? req.header("x-role") ?? "CERTEN_ADMIN").split(",").map((r: string) => r.trim()).filter(Boolean) as CertenRole[];
function guarded(req: any, res: any, operation: "READ" | "EVIDENCE") {
  try { requireRole(roles(req), operation); return true; } catch (error) { res.status(403).json(classifyProductionError(error)); return false; }
}

router.get("/summary", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "READ")) return;
    res.json(await getExecutiveProofPackAuthoritySummary(tenant(req)));
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

router.get("/", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "READ")) return;
    const filters: any = {};
    if (req.query.packType) filters.packType = String(req.query.packType);
    if (req.query.status) filters.status = String(req.query.status);
    res.json(listExecutiveProofPacks(tenant(req), filters));
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

router.post("/generate", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "READ")) return;
    const { packType, periodStart, periodEnd } = req.body;
    if (!packType) { res.status(400).json({ error: "packType is required" }); return; }
    const pack = await generateExecutiveProofPack({ tenantId: tenant(req), packType: packType as ExecutiveProofPackType, periodStart: periodStart ?? new Date().toISOString(), periodEnd: periodEnd ?? new Date().toISOString() });
    res.json(pack);
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

router.get("/:id", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "READ")) return;
    const pack = getExecutiveProofPack(tenant(req), String(req.params.id));
    if (!pack) { res.status(404).json({ error: "Pack not found" }); return; }
    res.json(pack);
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

router.post("/:id/exported", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "EVIDENCE")) return;
    const updated = markExecutiveProofPackExported(tenant(req), String(req.params.id));
    if (!updated) { res.status(404).json({ error: "Pack not found" }); return; }
    res.json(updated);
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

router.post("/:id/archive", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "EVIDENCE")) return;
    const updated = archiveExecutiveProofPack(tenant(req), String(req.params.id));
    if (!updated) { res.status(404).json({ error: "Pack not found" }); return; }
    res.json(updated);
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

router.get("/:id/export-readiness", requireTenantContext(), async (req, res) => {
  try {
    if (!guarded(req, res, "READ")) return;
    res.json(evaluateExecutiveProofPackExportReadiness(tenant(req), String(req.params.id)));
  } catch (error) { res.status(409).json(classifyProductionError(error)); }
});

export default router;
