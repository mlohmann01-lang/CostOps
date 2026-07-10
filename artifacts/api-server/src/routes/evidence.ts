import { Router } from "express";
import { EvidenceRegistryV2Service } from "../lib/evidence-registry-v2-service";
const router = Router(); const service = new EvidenceRegistryV2Service(); const tenant = (req: any) => req.tenantId ?? req.headers["x-tenant-id"] ?? req.query.tenantId ?? "default";
router.get("/", async (req, res, next) => { try { res.json(await service.listEvidence(String(tenant(req)))); } catch (e) { next(e); } });
router.get("/entity/:entityType/:entityId", async (req, res, next) => { try { res.json(await service.getEvidenceForEntity(String(tenant(req)), req.params.entityType, req.params.entityId)); } catch (e) { next(e); } });
router.get("/timeline/:entityType/:entityId", async (req, res, next) => { try { res.json(await service.getEvidenceTimeline(String(tenant(req)), req.params.entityType, req.params.entityId)); } catch (e) { next(e); } });
router.get("/:id", async (req, res, next) => { try { res.json(await service.getEvidence(String(tenant(req)), req.params.id)); } catch (e) { next(e); } });
export default router;
