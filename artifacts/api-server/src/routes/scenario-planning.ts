import { Router } from 'express';
import { scenarioPlanningService } from '../lib/scenario-planning/scenario-planning-service';
import { getScenarioPlanningAuthority } from '../lib/scenario-planning/scenario-planning-authority';
import type { ScenarioSubjectType, ScenarioType } from '../lib/scenario-planning/scenario-planning-types';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

function scenarioType(req: any): ScenarioType {
  const value = req.query.scenarioType;
  const allowed: ScenarioType[] = ['RETIRE', 'RENEW', 'OPTIMISE', 'EXPAND', 'CONSOLIDATE', 'DO_NOTHING'];
  return allowed.includes(value) ? value : 'RETIRE';
}

router.get('/', async (req, res, next) => {
  try { res.json(await scenarioPlanningService.getPortfolioView(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getScenarioPlanningAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/portfolio', async (req, res, next) => {
  try { res.json(await scenarioPlanningService.getPortfolioView(tenant(req))); } catch (e) { next(e); }
});
router.get('/assets/:id', async (req, res, next) => {
  try { res.json(await scenarioPlanningService.analyzeScenario(tenant(req), scenarioType(req), 'TECHNOLOGY', req.params.id)); } catch (e) { next(e); }
});
router.get('/vendors/:id', async (req, res, next) => {
  try { res.json(await scenarioPlanningService.analyzeScenario(tenant(req), scenarioType(req), 'VENDOR', req.params.id)); } catch (e) { next(e); }
});
router.get('/capabilities/:id', async (req, res, next) => {
  try { res.json(await scenarioPlanningService.analyzeScenario(tenant(req), scenarioType(req), 'CAPABILITY', req.params.id)); } catch (e) { next(e); }
});

export default router;
