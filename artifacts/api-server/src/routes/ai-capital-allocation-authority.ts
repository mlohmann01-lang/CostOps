import { Router } from 'express';
import { aiCapitalAllocationDecisionService } from '../lib/ai-capital-allocation-authority/ai-capital-allocation-authority-service';
import { getAICapitalAllocationAuthority } from '../lib/ai-capital-allocation-authority/ai-capital-allocation-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationDecisionService.getAllRecommendations(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getAICapitalAllocationAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationDecisionService.getSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/recommendations', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationDecisionService.getAllRecommendations(tenant(req))); } catch (e) { next(e); }
});
router.get('/review', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationDecisionService.getReviewBacklog(tenant(req))); } catch (e) { next(e); }
});
router.get('/initiatives/:initiativeId', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationDecisionService.getInitiativeNarrative(tenant(req), req.params.initiativeId)); } catch (e) { next(e); }
});
router.get('/initiatives/:initiativeId/scenario', async (req, res, next) => {
  try { res.json(await aiCapitalAllocationDecisionService.getScenarioFactors(tenant(req), req.params.initiativeId)); } catch (e) { next(e); }
});

export default router;
