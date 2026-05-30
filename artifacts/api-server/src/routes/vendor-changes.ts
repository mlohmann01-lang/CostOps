import { Router } from "express";
import { assessVendorChangeImpact } from "../lib/vcde/impact-assessment-engine";
import { generateVendorChangeOpportunities } from "../lib/vcde/opportunity-generation-engine";
import { VendorChangeRepository } from "../lib/vcde/vendor-change-repository";

const router = Router();
const repo = new VendorChangeRepository();

function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const changes = repo.list(tenantId);
  return res.json({ tenantId, summary: summary(changes), changes });
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

router.get("/:id/impact", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const change = repo.get(tenantId, String(req.params.id));
  if (!change) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  return res.json(assessVendorChangeImpact(change, tenantId));
});

router.post("/:id/assess", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const change = repo.get(tenantId, String(req.params.id));
  if (!change) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  const impact = assessVendorChangeImpact(change, tenantId);
  repo.setStatus(tenantId, change.id, impact.monthlyCostDelta > 0 ? "IMPACTED" : "ASSESSED");
  return res.json({ change: repo.get(tenantId, change.id), impact });
});

router.post("/:id/generate-opportunities", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const change = repo.get(tenantId, String(req.params.id));
  if (!change) return res.status(404).json({ error: "VENDOR_CHANGE_NOT_FOUND" });
  const impact = assessVendorChangeImpact(change, tenantId);
  const opportunities = generateVendorChangeOpportunities(change, impact);
  repo.setStatus(tenantId, change.id, opportunities.length ? "ACTIONED" : "ASSESSED");
  return res.status(201).json({ change: repo.get(tenantId, change.id), impact, opportunities });
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
