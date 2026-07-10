import { Router } from 'express';
import { aiEconomicsGraphAuthorityService } from '../lib/ai-economics-authority/ai-economics-authority-service';
import { getAIEconomicsAuthority } from '../lib/ai-economics-authority/ai-economics-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await aiEconomicsGraphAuthorityService.getAllInitiativeEconomics(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getAIEconomicsAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await aiEconomicsGraphAuthorityService.getSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/unknowns', async (req, res, next) => {
  try { res.json(await aiEconomicsGraphAuthorityService.getUnknowns(tenant(req))); } catch (e) { next(e); }
});
router.get('/initiatives/:initiativeId', async (req, res, next) => {
  try { res.json(await aiEconomicsGraphAuthorityService.getInitiativeNarrative(tenant(req), req.params.initiativeId)); } catch (e) { next(e); }
});
router.get('/assets/:assetId', async (req, res, next) => {
  try { res.json(await aiEconomicsGraphAuthorityService.getAssetEconomics(tenant(req), req.params.assetId)); } catch (e) { next(e); }
});

export default router;
