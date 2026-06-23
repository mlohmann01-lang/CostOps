import { Router } from 'express';
import { technologyEconomicsService } from '../lib/technology-economics-authority/technology-economics-service';
import { getTechnologyEconomicsAuthority } from '../lib/technology-economics-authority/technology-economics-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await technologyEconomicsService.getAllAssetEconomics(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getTechnologyEconomicsAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await technologyEconomicsService.getSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:id', async (req, res, next) => {
  try { res.json(await technologyEconomicsService.getAssetEconomics(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/vendors/:id', async (req, res, next) => {
  try { res.json(await technologyEconomicsService.getVendorEconomics(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/capabilities/:id', async (req, res, next) => {
  try {
    const metric = await technologyEconomicsService.getCapabilityEconomics(tenant(req), req.params.id);
    if (!metric) { res.status(404).json({ error: 'CAPABILITY_NOT_FOUND' }); return; }
    res.json(metric);
  } catch (e) { next(e); }
});

export default router;
