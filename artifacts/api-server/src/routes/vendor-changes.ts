import { Router } from "express";
import { assessVendorChangeImpact } from "../lib/vcde/impact-assessment-engine";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { runOpportunityFactory } from "../lib/opportunity-factory/opportunity-factory-service";
import { VendorChangeRepository } from "../lib/vcde/vendor-change-repository";
import { vendorChangePipelineService } from "../lib/vcde/vendor-change-pipeline-service";

const router = Router();
const repo = new VendorChangeRepository();
const opportunitiesRepo = new OpportunityRepository();

function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.get("/signals", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, signals: vendorChangePipelineService.listSignals(tenantId) });
});

router.post("/signals/ingest", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const body = req.body ?? {};
  if (!body.vendor || !body.sourceUrl || !body.title) return res.status(400).json({ error: "VENDOR_SIGNAL_REQUIRED_FIELDS" });
  const result = vendorChangePipelineService.ingestSignal({ tenantId, vendor: String(body.vendor).toUpperCase() as any, sourceType: body.sourceType, sourceUrl: String(body.sourceUrl), title: String(body.title), rawText: String(body.rawText ?? body.description ?? body.title), publishedAt: body.publishedAt ? String(body.publishedAt) : undefined, detectedAt: body.detectedAt ? String(body.detectedAt) : undefined });
  return res.status(result.duplicate ? 200 : 201).json(result);
});

router.get("/signals/:signalId", (req, res) => {
  const signal = vendorChangePipelineService.getSignal(tenantIdFrom(req), String(req.params.signalId));
  if (!signal) return res.status(404).json({ error: "VENDOR_SIGNAL_NOT_FOUND" });
  return res.json(signal);
});

router.get("/pipeline/health", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, ...vendorChangePipelineService.health(tenantId) });
});

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const changes = repo.list(tenantId);
  return res.json({ tenantId, summary: summary(changes), changes, signals: vendorChangePipelineService.listSignals(tenantId), pipelineHealth: vendorChangePipelineService.health(tenantId) });
});

router.get("/high-impact", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, changes: repo.highImpact(tenantId) });
});

router.get("/:id", (req, res) => {
  const change = repo.get(tenantIdFrom(req), String(req.params.id));
  if (!change) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  return res.json(change);
});

router.post("/:id/classify", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const result = vendorChangePipelineService.classify(tenantId, String(req.params.id));
  if (!result) return res.status(404).json({ error: "VENDOR_CHANGE_OR_SIGNAL_NOT_FOUND" });
  return res.json(result);
});

router.get("/:id/impact", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const change = repo.get(tenantId, String(req.params.id));
  if (!change) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  return res.json(assessVendorChangeImpact(change, tenantId));
});

router.post("/:id/assess", (req, res) => {
  const result = vendorChangePipelineService.assess(tenantIdFrom(req), String(req.params.id));
  if (!result) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  return res.json(result);
});

router.post("/:id/promote-to-opportunity", (req, res) => {
  vendorChangePipelineService.promoteToOpportunity(tenantIdFrom(req), String(req.params.id)).then((result) => {
    if (!result) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
    return res.status(201).json(result);
  }).catch((error) => res.status(500).json({ error: error instanceof Error ? error.message : String(error) }));
});

router.post("/:id/generate-opportunities", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const change = repo.get(tenantId, String(req.params.id));
  if (!change) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  const impact = assessVendorChangeImpact(change, tenantId);
  return runOpportunityFactory(tenantId).then((factory) => res.status(201).json({ change: repo.get(tenantId, change.id), impact, opportunities: opportunitiesRepo.getBySource(tenantId, "VENDOR_CHANGE").filter((opportunity) => opportunity.sourceReferenceId === change.id), factorySummary: factory.summary })).catch((error) => res.status(500).json({ error: error instanceof Error ? error.message : String(error) }));
});

function summary(changes: ReturnType<VendorChangeRepository["list"]>) {
  return {
    vendorChangesDetected: changes.length,
    highImpact: changes.filter((change) => change.impactSeverity === "HIGH" || change.impactSeverity === "CRITICAL").length,
    affectedSpend: changes.reduce((sum, change) => sum + Number(change.affectedSpend ?? 0), 0),
    generatedOpportunities: changes.reduce((sum, change) => sum + Number(change.generatedOpportunityCount ?? 0), 0),
  };
}

export default router;
