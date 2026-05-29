import { Router } from "express";
import { z } from "zod";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { prioritizeRecommendations } from "../lib/recommendations/opportunity-prioritizer";
import { buildCampaigns } from "../lib/campaigns/campaign-builder";
import { monitoredOutcomeService } from "../lib/drift/monitored-outcome-service";
import { outcomeProjectionService } from "../lib/outcomes/outcome-projection-service";

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

function projectCampaigns(tenantId: string, campaigns: any[]) {
  const projections = outcomeProjectionService.list(tenantId);
  const activeDrift = monitoredOutcomeService.list(tenantId).some((outcome) => outcome.monitoringState === 'DRIFT_DETECTED');
  if (!campaigns.length) return outcomeProjectionService.campaignProjections(tenantId).map((campaign) => ({ ...campaign, driftStatus: activeDrift ? 'DRIFTED' : campaign.driftStatus }))
  return campaigns.map((campaign) => {
    const ids = new Set((campaign.recommendationIds ?? []).map(String));
    const rows = projections.filter((projection) => projection.recommendationId && ids.has(String(projection.recommendationId)));
    const failed = rows.some((row) => row.outcomeState === 'VERIFICATION_FAILED');
    const verified = rows.filter((row) => row.outcomeState === 'VERIFIED').length;
    const outcomeStatus = activeDrift ? 'DRIFTED' : failed ? 'PARTIALLY_VERIFIED' : rows.length && verified === rows.length ? 'COMPLETED' : 'ACTIVE';
    return { ...campaign, verifiedSavings: rows.reduce((sum, row) => sum + row.verifiedMonthlySavings, 0), outcomeStatus, driftStatus: activeDrift ? 'DRIFTED' : 'MONITORED', campaignState: outcomeStatus };
  });
}

router.get('/', async (req, res) => {
  const tenantId = tenant(req);
  return res.json(projectCampaigns(tenantId, cache.get(tenantId) ?? []));
});

router.get('/:campaignId', async (req, res) => {
  const tenantId = tenant(req);
  const row = projectCampaigns(tenantId, cache.get(tenantId) ?? []).find((c) => c.campaignId === req.params.campaignId);
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  return res.json(row);
});

export default router;
