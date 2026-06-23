import { Router } from 'express';
import { executiveDecisionAuthorityService } from '../lib/executive-decision-authority/executive-decision-authority-service';
import { getExecutiveDecisionAuthority } from '../lib/executive-decision-authority/executive-decision-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await getExecutiveDecisionAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await executiveDecisionAuthorityService.getSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/queue', async (req, res, next) => {
  try { res.json(await executiveDecisionAuthorityService.getDecisionQueue(tenant(req))); } catch (e) { next(e); }
});
router.get('/decisions', async (req, res, next) => {
  try { res.json(await executiveDecisionAuthorityService.getAllDecisions(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:id', async (req, res, next) => {
  try { res.json(await executiveDecisionAuthorityService.getAssetDecision(tenant(req), req.params.id)); } catch (e) { next(e); }
});

export default router;
