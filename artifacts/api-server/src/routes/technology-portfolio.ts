import { Router } from "express";
import { requireTenantContext } from "../middleware/security-guards";
import {
  listPortfolioAssets,
  getPortfolioAsset,
  updatePortfolioAsset,
  listPortfolioOwners,
  listPortfolioContracts,
  listPortfolioRenewals,
  syncTechnologyPortfolioAuthority,
  getTechnologyPortfolioHealth,
} from "../lib/technology-portfolio/technology-portfolio-authority";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

router.get("/assets", requireTenantContext(), async (req, res) => {
  res.json(listPortfolioAssets(tenant(req)));
});

router.get("/assets/:id", requireTenantContext(), async (req, res) => {
  const asset = getPortfolioAsset(tenant(req), String(req.params.id));
  if (!asset) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(asset);
});

router.patch("/assets/:id", requireTenantContext(), async (req, res) => {
  const updated = updatePortfolioAsset(tenant(req), String(req.params.id), req.body);
  if (!updated) { res.status(404).json({ error: "Asset not found" }); return; }
  res.json(updated);
});

router.get("/owners", requireTenantContext(), async (req, res) => {
  res.json(listPortfolioOwners(tenant(req)));
});

router.get("/contracts", requireTenantContext(), async (req, res) => {
  res.json(listPortfolioContracts(tenant(req)));
});

router.get("/renewals", requireTenantContext(), async (req, res) => {
  res.json(listPortfolioRenewals(tenant(req)));
});

router.post("/sync", requireTenantContext(), async (req, res) => {
  const assets = await syncTechnologyPortfolioAuthority(tenant(req));
  res.json({ synced: assets.length, assets });
});

router.get("/health", requireTenantContext(), async (req, res) => {
  const health = await getTechnologyPortfolioHealth(tenant(req));
  res.json(health);
});

export default router;
