import { Router } from 'express';
import { executiveExperienceService } from '../lib/executive-experience/executive-experience-service';
import { getExecutiveExperienceAuthority } from '../lib/executive-experience/executive-experience-authority';
import { getConsolidatedAuthorityViews } from '../lib/executive-experience/executive-experience-consolidation';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(executiveExperienceService.getNavigation()); } catch (e) { next(e); }
});
router.get('/dashboard', async (req, res, next) => {
  try { res.json(await executiveExperienceService.getDashboard(tenant(req))); } catch (e) { next(e); }
});
router.get('/readiness', async (req, res, next) => {
  try { res.json(await getExecutiveExperienceAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/decisions', async (req, res, next) => {
  try { res.json(await executiveExperienceService.getDecisions(tenant(req))); } catch (e) { next(e); }
});
router.get('/risks', async (req, res, next) => {
  try { res.json(await executiveExperienceService.getRisks(tenant(req))); } catch (e) { next(e); }
});
router.get('/proof-packs', async (req, res, next) => {
  try { res.json(await executiveExperienceService.getProofPacks(tenant(req))); } catch (e) { next(e); }
});
router.get('/actions', async (req, res, next) => {
  try { res.json(await executiveExperienceService.getActions(tenant(req))); } catch (e) { next(e); }
});
router.get('/consolidation', async (req, res, next) => {
  try {
    const [authorities, findings] = await Promise.all([
      getConsolidatedAuthorityViews(tenant(req)),
      Promise.resolve(executiveExperienceService.getConsolidationFindings()),
    ]);
    res.json({ authorities, findings });
  } catch (e) { next(e); }
});

export default router;
