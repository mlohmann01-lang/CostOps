import { Router } from "express";
import { PlaybookRecommendationService } from "../lib/playbooks/playbook-recommendation-service";
import { buildExplainabilityEnvelope } from "../lib/recommendations/explainability-surface";
import { RecommendationRationalePersistenceService } from "../lib/recommendations/recommendation-rationale-persistence-service";
import { RecommendationOutcomeResolutionService } from "../lib/recommendations/recommendation-outcome-resolution-service";

const router = Router();
const svc = new PlaybookRecommendationService();
const rationaleSvc = new RecommendationRationalePersistenceService();
const outcomeSvc = new RecommendationOutcomeResolutionService();
const scope = (req:any)=>({ tenantId: String(req.query.tenantId ?? req.body?.tenantId ?? "default"), actorId: String(req.query.actorId ?? req.body?.actorId ?? "system") });

router.post("/m365/evaluate", async (req,res)=>{
  const {tenantId, actorId}=scope(req);
  const out = await svc.generateRecommendationsForTenant({ tenantId, actorId, source: req.body?.source ?? "DEMO", evidenceRecords: req.body?.evidenceRecords ?? [] });
  res.json(out);
});
router.get("/recommendations", async (req,res)=>{ const {tenantId}=scope(req); res.json(await svc.listRecommendations(tenantId)); });
router.get("/recommendations/:id", async (req,res)=>{ const {tenantId}=scope(req); const row=await svc.getRecommendation(tenantId, Number(req.params.id)); if(!row) { res.status(404).json({error:"Not found"}); return; } res.json(row); });
router.get("/recommendations/:id/explainability", async (req,res)=>{
  const { tenantId } = scope(req);
  const rationale = await rationaleSvc.getLatestRationale(tenantId, Number(req.params.id));
  if (!rationale) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(rationale);
});
router.get("/recommendations/:id/explainability/history", async (req,res)=>{
  const { tenantId } = scope(req);
  res.json(await rationaleSvc.getRationaleHistory(tenantId, Number(req.params.id)));
});
router.get("/recommendations/:id/decision-traces", async (req,res)=>{
  const { tenantId } = scope(req);
  res.json(await rationaleSvc.getDecisionTraces(tenantId, Number(req.params.id)));
});
router.get("/recommendations/:id/explainability/integrity", async (req,res)=>{
  const { tenantId } = scope(req);
  const rationale = await rationaleSvc.getLatestRationale(tenantId, Number(req.params.id));
  if (!rationale) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const replayIntegrityStatus = rationaleSvc.validateRecommendationReplayIntegrity(rationale);
  res.json({
    deterministicHash: rationale.deterministicHash,
    explainabilityVersion: rationale.explainabilityVersion,
    reasoningSchemaVersion: rationale.reasoningSchemaVersion,
    replayIntegrityValid: replayIntegrityStatus === "VALID",
    replayIntegrityStatus,
  });
});
router.get("/recommendations/explainability/surface", async (req,res)=>{
  const { tenantId } = scope(req);
  const rows = await svc.listRecommendations(tenantId);
  const shaped = rows.map((row)=>buildExplainabilityEnvelope(row as Record<string, unknown>));
  res.json({ tenantId, count: shaped.length, recommendations: shaped });
});
router.get("/suppressed", async (req,res)=>{ const {tenantId}=scope(req); res.json(await svc.listSuppressed(tenantId)); });

router.post("/recommendations/:id/outcomes/resolve", async (req,res)=>{
  const { tenantId } = scope(req);
  const row = await outcomeSvc.resolveRecommendationOutcome(tenantId, String(req.params.id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});
router.get("/recommendations/:id/outcomes", async (req,res)=>{
  const { tenantId } = scope(req);
  res.json(await outcomeSvc.getOutcomes(tenantId, String(req.params.id)));
});
router.get("/recommendations/:id/outcomes/latest", async (req,res)=>{
  const { tenantId } = scope(req);
  const rows = await outcomeSvc.getOutcomes(tenantId, String(req.params.id));
  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});
router.get("/recommendations/:id/outcomes/integrity", async (req,res)=>{
  const { tenantId } = scope(req);
  const rows = await outcomeSvc.getOutcomes(tenantId, String(req.params.id));
  if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
  const latest = rows[0];
  res.json({ deterministicHash: latest.deterministicHash, resolutionEngineVersion: latest.resolutionEngineVersion, integrityValid: true });
});
router.get("/connectors/m365/realized-intelligence", async (req,res)=>{
  const { tenantId } = scope(req);
  const rows = await svc.listRecommendations(tenantId);
  const outcomes = await Promise.all(rows.map((r:any)=>outcomeSvc.getOutcomes(tenantId, String(r.id)).then((x)=>x[0]).catch(()=>null)));
  const latest = outcomes.filter(Boolean) as any[];
  const byStatus = (st:string)=>latest.filter((r)=>r.outcomeStatus===st).length;
  res.json({ totalRecommendations: rows.length, realized: byStatus("REALIZED"), partiallyRealized: byStatus("PARTIALLY_REALIZED"), failed: byStatus("FAILED"), drifted: byStatus("DRIFTED"), reversed: byStatus("REVERSED"), unverified: byStatus("UNVERIFIED") + byStatus("PENDING"), projectedMonthlySavings: latest.reduce((s,r)=>s+Number(r.projectedMonthlySavings??0),0), realizedMonthlySavings: latest.reduce((s,r)=>s+Number(r.realizedMonthlySavings??0),0), confidenceAccuracyDistribution: { accurate: latest.filter((r)=>r.confidenceCalibration==="CONFIDENCE_ACCURATE").length, overstated: latest.filter((r)=>r.confidenceCalibration==="CONFIDENCE_OVERSTATED").length, understated: latest.filter((r)=>r.confidenceCalibration==="CONFIDENCE_UNDERSTATED").length }, realizationDeltaDistribution: latest.map((r)=>r.realizationDeltaPercent) });
});

router.post("/recommendations/:id/create-orchestration-plan", async (req,res)=>{ try{ const {tenantId,actorId}=scope(req); const out=await svc.createOrchestrationPlanFromRecommendation(tenantId, Number(req.params.id), actorId); res.json(out);}catch(err:any){ res.status(409).json({error:String(err?.message ?? err)});} });

export default router;
