import { Router } from 'express';
import { RecommendationGovernanceEventService } from '../lib/recommendations/governance-event-service';
import { platformEventService } from '../lib/events/platform-event-service';
import { normalizeRecommendationGovernanceEvent } from '../lib/events/event-normalizer';
import type { PlatformEventCategory } from '../lib/events/platform-event-types';

const router = Router();
const recEvents = new RecommendationGovernanceEventService();
const tenant = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

router.get('/events/recent', async (req,res)=>{
  const t=tenant(req);
  return res.json(await platformEventService.listEvents(t, { limit: Number(req.query.limit ?? 25) }));
});

router.get('/events/category/:category', async (req,res)=>{
  const t=tenant(req);
  return res.json(await platformEventService.listByCategory(t, String(req.params.category).toUpperCase() as PlatformEventCategory, Number(req.query.limit ?? 200)));
});

router.get('/events/entity/:entityType/:entityId', async (req,res)=>{
  const t=tenant(req); const {entityType, entityId}=req.params;
  return res.json(await platformEventService.listByEntity(t, entityType, entityId, Number(req.query.limit ?? 200)));
});

router.get('/events/:eventId', async (req,res)=>{
  const event = await platformEventService.getEvent(tenant(req), req.params.eventId);
  if (!event) return res.status(404).json({ error: 'PLATFORM_EVENT_NOT_FOUND' });
  return res.json(event);
});

router.get('/events', async (req,res)=>{
  const t=tenant(req);
  const entityType = String(req.query.entityType ?? '');
  const entityId = String(req.query.entityId ?? '');
  if (entityType && entityId) return res.json(await platformEventService.listByEntity(t, entityType, entityId, Number(req.query.limit ?? 200)));
  return res.json(await platformEventService.listEvents(t, { category: req.query.category ? String(req.query.category).toUpperCase() : undefined, from: req.query.from ? String(req.query.from) : undefined, to: req.query.to ? String(req.query.to) : undefined, limit: Number(req.query.limit ?? 200) }));
});

router.get('/events/:entityType/:entityId/timeline', async (req,res)=>{
  const t=tenant(req); const {entityType, entityId}=req.params;
  if (entityType === 'RECOMMENDATION') {
    const rows = await recEvents.list(t, entityId);
    for (const event of rows.map(normalizeRecommendationGovernanceEvent)) {
      try { await platformEventService.recordEvent({ tenantId: event.tenantId, category: 'PRIORITY', type: event.eventType, eventId: event.eventId, title: event.eventType, description: event.eventReason, actorId: event.actorId, entityType: event.entityType, entityId: event.entityId, sourceSystem: event.sourceSystem, metadata: { evidenceSnapshot: event.evidenceSnapshot }, occurredAt: event.createdAt }); } catch {}
    }
  }
  return res.json(await platformEventService.listByEntity(t, entityType, entityId, Number(req.query.limit ?? 200)));
});

export default router;
