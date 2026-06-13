import { Router } from "express";
import { getCertifiedWedgeRegistry, getCertifiedWedgeRegistrySummary } from "../lib/certification/certified-wedge-registry";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

router.get("/wedges/summary", async (req, res) => {
  try { return res.json(await getCertifiedWedgeRegistrySummary(tenant(req))); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/wedges/:wedgeId", async (req, res) => {
  try {
    const registry = await getCertifiedWedgeRegistry(tenant(req));
    const entry = registry.find((w) => w.wedgeId === req.params.wedgeId);
    if (!entry) return res.status(404).json({ error: "Wedge not found" });
    return res.json(entry);
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.get("/wedges", async (req, res) => {
  try { return res.json(await getCertifiedWedgeRegistry(tenant(req))); }
  catch (err: any) { return res.status(500).json({ error: err.message }); }
});

export default router;
