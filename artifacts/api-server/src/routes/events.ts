import { Router } from 'express';
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service';
import { getEntityTimeline, listUnifiedEvents } from '../lib/events/evidence-timeline';
import { normalizeRecommendationGovernanceEvent } from '../lib/events/event-normalizer';

const router = Router();
const recEvents = new RecommendationGovernanceEventService();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

router.get('/events', async (req,res)=>{
  const t=tenant(req);
  const entityType = String(req.query.entityType ?? '');
  const entityId = String(req.query.entityId ?? '');
  if (entityType && entityId) return res.json(getEntityTimeline(t, entityType, entityId));
  return res.json(listUnifiedEvents(t));
});

router.get('/events/:entityType/:entityId/timeline', async (req,res)=>{
  const t=tenant(req); const {entityType, entityId}=req.params;
  if (entityType === 'RECOMMENDATION') {
    const rows = await recEvents.list(t, entityId);
    return res.json(rows.map(normalizeRecommendationGovernanceEvent).sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime() || a.eventId.localeCompare(b.eventId)));
  }
  return res.json(getEntityTimeline(t, entityType, entityId));
});

export default router;
