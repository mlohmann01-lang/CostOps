import { Router } from "express";
import { getPersistenceProvider, resetPersistenceProvider } from "../lib/persistence/persistence-provider";
import { ALL_COLLECTIONS } from "../lib/persistence/persistence-collections";
import { getRuntimeEnv } from "../lib/config/env";
import { requireTenantContext, requireCapability } from "../middleware/security-guards";

const router = Router();

router.get("/health", (_req, res) => {
  try {
    const provider = getPersistenceProvider();
    const env = getRuntimeEnv();
    res.json({
      provider: provider.mode,
      databaseConfigured: Boolean(process.env["DATABASE_URL"]),
      productionSafe: env !== "production" || provider.mode === "DATABASE",
      collections: ALL_COLLECTIONS,
    });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Persistence provider unavailable" });
  }
});

router.get("/collections", (_req, res) => {
  res.json({ collections: ALL_COLLECTIONS });
});

router.post("/tenant/:tenantId/clear", requireTenantContext(), requireCapability("MANAGE_POLICIES"), async (req, res) => {
  const env = getRuntimeEnv();
  const allowClear = process.env["ALLOW_TENANT_CLEAR"] === "true";
  if (env === "production" && !allowClear) {
    return res.status(403).json({ error: "Tenant clear is disabled in production. Set ALLOW_TENANT_CLEAR=true to enable." });
  }
  const tenantId = String(req.params["tenantId"]);
  try {
    await getPersistenceProvider().clearTenant(tenantId);
    return res.json({ cleared: true, tenantId });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Clear failed" });
  }
});

export default router;
