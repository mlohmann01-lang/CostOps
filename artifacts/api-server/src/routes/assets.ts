import { Router } from "express";
import { EvidenceRegistryV2Service } from "../lib/evidence-registry-v2-service";
import { AssetRegistryService } from "../lib/assets/asset-registry-service";

const router = Router();
const assets = new AssetRegistryService();
const evidence = new EvidenceRegistryV2Service();
const tenant = (req: any) => String(req.__authContext?.tenantId ?? req.tenantId ?? req.header?.("x-tenant-id") ?? req.query.tenantId ?? req.body?.tenantId ?? "default");
const send = (fn: any) => async (req: any, res: any) => { try { const out = await fn(req, res); if (!res.headersSent) res.json(out); } catch (e: any) { res.status(400).json({ error: String(e?.message ?? e) }); } };

router.get("/", send((req: any) => assets.listAssets(tenant(req), { assetType: req.query.assetType, status: req.query.status })));
router.get("/source/:sourceSystem/:sourceEntityType/:sourceEntityId", send(async (req: any, res: any) => { const out = await assets.getAssetBySource(tenant(req), req.params.sourceSystem, req.params.sourceEntityType, req.params.sourceEntityId); if (!out) return res.status(404).json({ error: "ASSET_SOURCE_MAPPING_NOT_FOUND" }); return out; }));
router.post("/backfill/m365", send((req: any) => assets.backfillM365(tenant(req))));
router.post("/backfill/servicenow", send((req: any) => assets.backfillServiceNow(tenant(req))));
router.post("/backfill/operational", send((req: any) => assets.backfillOperational(tenant(req))));
router.get("/:id/owners", send((req: any) => assets.getOwnersForAsset(tenant(req), req.params.id)));
router.get("/:id/evidence", send((req: any) => evidence.getEvidenceForEntity(tenant(req), "ASSET", req.params.id)));
router.get("/:id", send(async (req: any, res: any) => { const asset = await assets.getAssetById(tenant(req), req.params.id); if (!asset) return res.status(404).json({ error: "ASSET_NOT_FOUND" }); return asset; }));

export default router;
