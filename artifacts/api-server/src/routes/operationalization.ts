import { authMiddleware } from "../middleware/auth";
import { Router } from "express";
import {
  db,
  discoveredAppsTable,
  entitlementOwnershipEdgesTable,
  metadataMappingEventsTable,
  operationalizationPacksTable,
  operationalizationPackEventsTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { runOperationalizationAssessment } from "../lib/operationalization/operationalization-runner";
import { runOperationalizationPack } from "../lib/operationalization/packs/pack-runner";

const router = Router();
router.use(authMiddleware);

router.post("/run", async (req, res) => res.json(await runOperationalizationAssessment({ tenantId: req.body?.tenantId ?? "default" })));
router.get("/apps", async (req, res) => res.json(await db.select().from(discoveredAppsTable).where(eq(discoveredAppsTable.tenantId, (req.query.tenantId as string) ?? "default")).orderBy(desc(discoveredAppsTable.priorityScore))));
router.get("/ownership-edges", async (req, res) => res.json(await db.select().from(entitlementOwnershipEdgesTable).where(eq(entitlementOwnershipEdgesTable.tenantId, (req.query.tenantId as string) ?? "default")).orderBy(desc(entitlementOwnershipEdgesTable.createdAt))));
router.get("/metadata-mappings", async (req, res) => res.json(await db.select().from(metadataMappingEventsTable).where(eq(metadataMappingEventsTable.tenantId, (req.query.tenantId as string) ?? "default")).orderBy(desc(metadataMappingEventsTable.createdAt))));

router.post("/packs/run", async (req, res) => res.json(await runOperationalizationPack({ tenantId: req.body?.tenantId ?? "default", packType: req.body?.packType ?? "SERVICENOW_SAM_ACCELERATION" })));
router.get("/packs", async (req, res) => res.json(await db.select().from(operationalizationPacksTable).where(eq(operationalizationPacksTable.tenantId, (req.query.tenantId as string) ?? "default")).orderBy(desc(operationalizationPacksTable.updatedAt))));
router.get("/packs/events", async (req, res) => res.json(await db.select().from(operationalizationPackEventsTable).where(eq(operationalizationPackEventsTable.tenantId, (req.query.tenantId as string) ?? "default")).orderBy(desc(operationalizationPackEventsTable.createdAt))));
router.get("/packs/:packId", async (req, res) => {
  const rows = await db.select().from(operationalizationPacksTable).where(eq(operationalizationPacksTable.id, Number(req.params.packId)));
  return res.json(rows[0] ?? null);
});

export default router;
