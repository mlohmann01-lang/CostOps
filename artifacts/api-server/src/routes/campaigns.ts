import { Router } from "express";
import { z } from "zod";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { prioritizeRecommendations } from "../lib/recommendations/opportunity-prioritizer";
import { buildCampaigns } from "../lib/campaigns/campaign-builder";

const router = Router();
const repo = new GovernedRecommendationRepository();
const cache = new Map<string, any[]>();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const schema = z.object({ grouping: z.enum(["department","costCentre","playbookType","riskClass","executionReadiness","priorityBand","connector"]) });

router.post('/build', async (req, res) => {
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_BUILD_REQUEST' });
  const tenantId = tenant(req);
  const rows = prioritizeRecommendations(await repo.list(tenantId, {}));
  const campaigns = buildCampaigns({ tenantId, recommendations: rows, grouping: parsed.data.grouping });
  cache.set(tenantId, campaigns);
  return res.json(campaigns);
});

router.get('/', async (req, res) => {
  const tenantId = tenant(req);
  return res.json(cache.get(tenantId) ?? []);
});

router.get('/:campaignId', async (req, res) => {
  const tenantId = tenant(req);
  const row = (cache.get(tenantId) ?? []).find((c) => c.campaignId === req.params.campaignId);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json(row);
});

export default router;
