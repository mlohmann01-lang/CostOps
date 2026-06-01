import { Router } from "express";
import { summarizeRenewals, buildRenewalIntelligenceRow } from "../lib/renewals/renewal-intelligence-engine";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { RenewalRepository } from "../lib/renewals/renewal-repository";
import { calculateRenewalReadiness } from "../lib/renewals/renewal-readiness-engine";

const router = Router();
const repo = new RenewalRepository();
const opportunities = new OpportunityRepository();

function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }
function notFound(res: any) { return res.status(404).json({ error: "RENEWAL_NOT_FOUND" }); }

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const renewals = repo.list(tenantId).map(buildRenewalIntelligenceRow);
  return res.json({ tenantId, summary: summarizeRenewals(repo.list(tenantId)), renewals });
});

router.get("/upcoming", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, renewals: repo.upcoming(tenantId).map(buildRenewalIntelligenceRow) });
});

router.get("/high-risk", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, renewals: repo.highRisk(tenantId).map(buildRenewalIntelligenceRow) });
});

router.get("/:id", (req, res) => {
  const renewal = repo.getById(tenantIdFrom(req), String(req.params.id));
  if (!renewal) return notFound(res);
  return res.json(buildRenewalIntelligenceRow(renewal));
});

router.get("/:id/readiness", (req, res) => {
  const renewal = repo.getById(tenantIdFrom(req), String(req.params.id));
  if (!renewal) return notFound(res);
  const readiness = calculateRenewalReadiness(renewal);
  return res.json({ ...readiness, opportunities: opportunities.getBySource(tenantIdFrom(req), "RENEWAL").filter((opportunity) => opportunity.sourceReferenceId === renewal.id) });
});

export default router;
