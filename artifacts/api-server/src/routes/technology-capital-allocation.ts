import { Router } from 'express';
import { technologyCapitalAllocationDecisionService } from '../lib/technology-capital-allocation-authority/technology-capital-allocation-authority-service';
import { getTechnologyCapitalAllocationAuthority } from '../lib/technology-capital-allocation-authority/technology-capital-allocation-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getAllRecommendations(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getTechnologyCapitalAllocationAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/recommendations', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getAllRecommendations(tenant(req))); } catch (e) { next(e); }
});
router.get('/review', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getReviewBacklog(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:id', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getAssetNarrative(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/vendors/:id', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getVendorAllocations(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/renewals', async (req, res, next) => {
  try { res.json(await technologyCapitalAllocationDecisionService.getAllRenewalRecommendations(tenant(req))); } catch (e) { next(e); }
});

export default router;
