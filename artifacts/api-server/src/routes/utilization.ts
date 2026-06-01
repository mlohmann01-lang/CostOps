import { Router } from "express";
import { summarizeUtilization } from "../lib/utilization/utilization-engine";
import { OpportunityRepository } from "../lib/opportunities/opportunity-repository";
import { UtilizationRepository } from "../lib/utilization/utilization-repository";

const router = Router();
const repo = new UtilizationRepository();
const opportunities = new OpportunityRepository();
function tenantIdFrom(req: any) { return String(req.tenantId ?? req.query.tenantId ?? "default"); }

router.get("/", (req, res) => {
  const tenantId = tenantIdFrom(req);
  const records = repo.list(tenantId);
  return res.json({ tenantId, summary: summarizeUtilization(records, opportunities.getBySource(tenantId, "UTILIZATION").length), records });
});

router.get("/low", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, records: repo.low(tenantId) });
});

router.get("/opportunities", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, opportunities: opportunities.getBySource(tenantId, "UTILIZATION") });
});

router.get("/platform/:platform", (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, records: repo.byPlatform(tenantId, String(req.params.platform)) });
});

export default router;
