import { Router } from 'express';
import { technologyInvestmentService } from '../lib/technology-investment-authority/technology-investment-service';
import { getTechnologyInvestmentAuthority } from '../lib/technology-investment-authority/technology-investment-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await technologyInvestmentService.getGraph(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getTechnologyInvestmentAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await technologyInvestmentService.getSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/gaps', async (req, res, next) => {
  try { res.json((await technologyInvestmentService.getGraph(tenant(req))).gaps); } catch (e) { next(e); }
});
router.get('/recommendations', async (req, res, next) => {
  try { res.json(await technologyInvestmentService.getAllRecommendations(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:assetId', async (req, res, next) => {
  try { res.json(await technologyInvestmentService.getNarrative(tenant(req), req.params.assetId)); } catch (e) { next(e); }
});
router.get('/capabilities/:capabilityId', async (req, res, next) => {
  try {
    const capabilities = await technologyInvestmentService.getCapabilities(tenant(req));
    const capability = capabilities.find((c) => c.id === req.params.capabilityId);
    if (!capability) { res.status(404).json({ error: 'CAPABILITY_NOT_FOUND' }); return; }
    res.json(capability);
  } catch (e) { next(e); }
});
router.get('/objectives/:objectiveId', async (req, res, next) => {
  try {
    const capabilities = await technologyInvestmentService.getCapabilities(tenant(req));
    res.json(capabilities.filter((c) => c.objectiveIds.includes(req.params.objectiveId)));
  } catch (e) { next(e); }
});

export default router;
