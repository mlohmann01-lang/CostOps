import { Router } from "express";
import { PlaybookRecommendationService } from "../lib/playbooks/playbook-recommendation-service";

const router = Router();
const svc = new PlaybookRecommendationService();
const scope = (req:any)=>({ tenantId: String(req.query.tenantId ?? req.body?.tenantId ?? "default"), actorId: String(req.query.actorId ?? req.body?.actorId ?? "system") });

router.post("/m365/evaluate", async (req,res)=>{
  const {tenantId, actorId}=scope(req);
  const out = await svc.generateRecommendationsForTenant({ tenantId, actorId, source: req.body?.source ?? "DEMO", evidenceRecords: req.body?.evidenceRecords ?? [] });
  res.json(out);
});
router.get("/recommendations", async (req,res)=>{ const {tenantId}=scope(req); res.json(await svc.listRecommendations(tenantId)); });
router.get("/recommendations/:id", async (req,res)=>{ const {tenantId}=scope(req); const row=await svc.getRecommendation(tenantId, Number(req.params.id)); if(!row) { res.status(404).json({error:"Not found"}); return; } res.json(row); });
router.get("/suppressed", async (req,res)=>{ const {tenantId}=scope(req); res.json(await svc.listSuppressed(tenantId)); });
router.post("/recommendations/:id/create-orchestration-plan", async (req,res)=>{ try{ const {tenantId,actorId}=scope(req); const out=await svc.createOrchestrationPlanFromRecommendation(tenantId, Number(req.params.id), actorId); res.json(out);}catch(err:any){ res.status(409).json({error:String(err?.message ?? err)});} });

export default router;
