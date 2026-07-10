import { Router } from 'express';
import { aiCapitalAllocationAuthorityService } from '../lib/ai-capital-allocation/ai-capital-allocation-service';

const router = Router();
const tenant = (req: any) => req.tenantId ?? req.headers['x-tenant-id'] ?? req.query.tenantId ?? 'default';

router.get('/allocations', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationAuthorityService.listAllocations(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/allocations', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationAuthorityService.createAllocation({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/allocations/:id', async (req, res, next) => {
  try {
    const allocation = await aiCapitalAllocationAuthorityService.getAllocation(tenant(req), req.params.id);
    if (!allocation) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(allocation);
  } catch (e) { next(e); }
});
router.get('/recommendations', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationAuthorityService.getCapitalAllocationRecommendations(tenant(req), req.query.limit ? Number(req.query.limit) : undefined)); } catch (e) { next(e); }
});
router.get('/portfolio-summary', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationAuthorityService.getPortfolioAllocationSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/initiatives/:id/allocation', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationAuthorityService.getInitiativeAllocation(tenant(req), req.params.id)); } catch (e) { next(e); }
});

export default router;
