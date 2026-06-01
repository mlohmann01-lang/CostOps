import { Router } from "express";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";

const router = Router();
const repo = new OpportunityRepository();

function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const opportunities = repo.list(tenantId);
  return res.json({ tenantId, summary: repo.summary(tenantId), opportunities });
});

router.get("/top", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const limit = Number(req.query.limit ?? 3);
  return res.json({ tenantId, opportunities: repo.top(tenantId, Number.isFinite(limit) ? limit : 3) });
});

router.get("/source/:source", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, source: String(req.params.source).toUpperCase(), opportunities: repo.getBySource(tenantId, String(req.params.source).toUpperCase() as any) });
});

router.get("/domain/:domain", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, domain: String(req.params.domain).toUpperCase(), opportunities: repo.getByDomain(tenantId, req.params.domain) });
});

router.get("/:id", (req, res) => {
  const opportunity = repo.getById(tenantIdFrom(req), String(req.params.id));
  if (!opportunity) return res.status(404).json({ error: "OPPORTUNITY_NOT_FOUND" });
  return res.json(opportunity);
});

export default router;
