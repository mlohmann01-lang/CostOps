import { Router } from "express";
import { AssetRegistryService } from "../lib/assets/asset-registry-service";
const router = Router();
const assets = new AssetRegistryService();
const tenant = (req: any) => String(req.tenantId ?? req.__authContext?.tenantId ?? req.header?.("x-tenant-id") ?? req.query.tenantId ?? "default");
router.get("/", async (req, res, next) => { try { res.json(await assets.getAssetOwners(tenant(req))); } catch (e) { next(e); } });
export default router;
