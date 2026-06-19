import { Router } from 'express';
import { aiValueAttributionService } from '../lib/ai-value-attribution/ai-value-attribution-service';

const router = Router();
const tenant = (req: any) => req.__authContext?.tenantId ?? req.headers['x-tenant-id'] ?? req.query.tenantId ?? 'default';

router.get('/activities', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.listActivities(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/activities', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.createAIActivity({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/activities/:id', async (req, res, next) => {
  try {
    const activity = await aiValueAttributionService.getActivityById(tenant(req), req.params.id);
    if (!activity) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(activity);
  } catch (e) { next(e); }
});
router.get('/attributions', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.listAttributions(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/attributions', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.createAttribution({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/attributions/:id', async (req, res, next) => {
  try {
    const attribution = await aiValueAttributionService.getAttributionById(tenant(req), req.params.id);
    if (!attribution) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(attribution);
  } catch (e) { next(e); }
});
router.get('/workflows/:id/value', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.getWorkflowAIValue(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/investments/:id/value', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.getInvestmentAIValue(tenant(req), req.params.id)); } catch (e) { next(e); }
});

export default router;
