import { Router } from "express";
import { PrincipalAuthorityService } from "../lib/principal-authority-service";
const router = Router(); const service = new PrincipalAuthorityService(); const tenant = (req: any) => req.__authContext?.tenantId ?? req.headers["x-tenant-id"] ?? req.query.tenantId ?? "default";
router.get("/", async (req, res, next) => { try { res.json(await service.listPrincipals(String(tenant(req)))); } catch (e) { next(e); } });
router.get("/resolve", async (req, res, next) => { try { res.json(await service.resolvePrincipal({ tenantId: String(tenant(req)), email: req.query.email as string | undefined, externalId: req.query.externalId as string | undefined, displayName: req.query.displayName as string | undefined, sourceSystem: req.query.sourceSystem as string | undefined })); } catch (e) { next(e); } });
router.get("/:id", async (req, res, next) => { try { res.json(await service.getPrincipal(String(tenant(req)), req.params.id)); } catch (e) { next(e); } });
router.get("/:id/action-events", async (req, res, next) => { try { res.json(await service.listActionEvents(String(tenant(req)), req.params.id)); } catch (e) { next(e); } });
export default router;
