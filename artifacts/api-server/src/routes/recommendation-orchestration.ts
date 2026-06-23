import { Router } from 'express';
import { recommendationOrchestrationService } from '../lib/recommendation-orchestration/recommendation-orchestration-service';
import { getRecommendationOrchestrationAuthority } from '../lib/recommendation-orchestration/recommendation-orchestration-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await recommendationOrchestrationService.getAllExecutionPlans(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getRecommendationOrchestrationAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/queue', async (req, res, next) => {
  try { res.json(await recommendationOrchestrationService.getQueue(tenant(req))); } catch (e) { next(e); }
});
router.get('/packages', async (req, res, next) => {
  try { res.json(await recommendationOrchestrationService.getAllExecutionPackages(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:id', async (req, res, next) => {
  try { res.json(await recommendationOrchestrationService.buildExecutionPackage(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/blocked', async (req, res, next) => {
  try { res.json((await recommendationOrchestrationService.getQueue(tenant(req))).blocked); } catch (e) { next(e); }
});

export default router;
