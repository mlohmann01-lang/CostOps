import { Router } from 'express';
import { executiveCommandCenterService } from '../lib/executive-command-center/executive-command-center-service';
import { getExecutiveCommandCenterAuthority } from '../lib/executive-command-center/executive-command-center-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await executiveCommandCenterService.getExecutiveValueSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await executiveCommandCenterService.getDashboard(tenant(req))); } catch (e) { next(e); }
});
router.get('/investments', async (req, res, next) => {
  try { res.json(await executiveCommandCenterService.getInvestmentView(tenant(req))); } catch (e) { next(e); }
});
router.get('/risks', async (req, res, next) => {
  try { res.json(await executiveCommandCenterService.getRiskView(tenant(req))); } catch (e) { next(e); }
});
router.get('/readiness', async (req, res, next) => {
  try { res.json(await getExecutiveCommandCenterAuthority(tenant(req))); } catch (e) { next(e); }
});

export default router;
