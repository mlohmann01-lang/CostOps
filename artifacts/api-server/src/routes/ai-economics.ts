import { Router } from 'express';
import { aiEconomicsAuthorityService } from '../lib/ai-economics/ai-economics-service';

const router = Router();
const tenant = (req: any) => req.__authContext?.tenantId ?? req.headers['x-tenant-id'] ?? req.query.tenantId ?? 'default';

router.get('/profiles', async (req, res, next) => {
  try { res.json(await aiEconomicsAuthorityService.listEconomicProfiles(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/profiles', async (req, res, next) => {
  try { res.json(await aiEconomicsAuthorityService.createEconomicProfile({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/profiles/:id', async (req, res, next) => {
  try {
    const profile = await aiEconomicsAuthorityService.getEconomicProfile(tenant(req), req.params.id);
    if (!profile) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(profile);
  } catch (e) { next(e); }
});
router.get('/investments/:id/economics', async (req, res, next) => {
  try { res.json(await aiEconomicsAuthorityService.getInvestmentEconomics(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/workflows/:id/economics', async (req, res, next) => {
  try { res.json(await aiEconomicsAuthorityService.getWorkflowEconomics(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.post('/cost-signals', async (req, res, next) => {
  try { res.json(await aiEconomicsAuthorityService.createCostSignal({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});

export default router;
