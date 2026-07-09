import { Router } from 'express';
import { closedLoopOptimisationService } from '../lib/closed-loop-optimisation/closed-loop-optimisation-service';
import { getClosedLoopOptimisationAuthority } from '../lib/closed-loop-optimisation/closed-loop-optimisation-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await closedLoopOptimisationService.getAllOptimisations(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getClosedLoopOptimisationAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/portfolio', async (req, res, next) => {
  try { res.json(await closedLoopOptimisationService.getPortfolio(tenant(req))); } catch (e) { next(e); }
});
router.get('/recommendations', async (req, res, next) => {
  try { res.json(await closedLoopOptimisationService.getAllOptimisations(tenant(req))); } catch (e) { next(e); }
});
router.get('/approved', async (req, res, next) => {
  try { res.json((await closedLoopOptimisationService.getPortfolio(tenant(req))).approved); } catch (e) { next(e); }
});
router.get('/executing', async (req, res, next) => {
  try { res.json((await closedLoopOptimisationService.getPortfolio(tenant(req))).executing); } catch (e) { next(e); }
});
router.get('/verified', async (req, res, next) => {
  try { res.json((await closedLoopOptimisationService.getPortfolio(tenant(req))).verified); } catch (e) { next(e); }
});
router.get('/value', async (req, res, next) => {
  try { res.json((await closedLoopOptimisationService.getPortfolio(tenant(req))).valueRealised); } catch (e) { next(e); }
});
router.get('/learning', async (req, res, next) => {
  try { res.json(await closedLoopOptimisationService.getAllLearning(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:id', async (req, res, next) => {
  try { res.json(await closedLoopOptimisationService.getNarrative(tenant(req), req.params.id)); } catch (e) { next(e); }
});

export default router;
