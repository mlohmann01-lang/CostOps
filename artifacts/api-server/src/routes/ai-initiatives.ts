// Program AI2 — API Surface.
//
// Dedicated, properly tenant-guarded router (mounted in routes/index.ts with
// requireTenantContext()/requireCapability(), matching the AI1 precedent in
// routes/outcome-attribution.ts). Read/write over data already exposed by
// ../lib/ai-initiative-portfolio — does not duplicate the pre-existing
// /ai-initiative-portfolio router's spend-based evaluation logic.

import { Router } from 'express';
import { aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';
import { getAIInitiativePortfolioAuthority } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-authority';

const router = Router();

const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json({ initiatives: await aiInitiativePortfolioService.listInitiatives(tenant(req), req.query as any) }); } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.createInitiative({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});

router.get('/portfolio', async (req, res, next) => {
  try {
    const tenantId = tenant(req);
    const [summary, executiveView] = await Promise.all([
      aiInitiativePortfolioService.getPortfolioSummary(tenantId),
      aiInitiativePortfolioService.getExecutivePortfolioView(tenantId),
    ]);
    res.json({ summary, executiveView });
  } catch (e) { next(e); }
});

router.get('/authority', async (req, res, next) => {
  try { res.json(await getAIInitiativePortfolioAuthority(tenant(req))); } catch (e) { next(e); }
});

router.get('/recommendations', async (req, res, next) => {
  try {
    const tenantId = tenant(req);
    const initiatives = await aiInitiativePortfolioService.listInitiatives(tenantId);
    const recommendations = await Promise.all(initiatives.map((i) => aiInitiativePortfolioService.recommendAction(tenantId, i.id)));
    res.json({ recommendations });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const initiative = await aiInitiativePortfolioService.getInitiative(tenant(req), req.params.id);
    if (!initiative) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(initiative);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.updateInitiative(tenant(req), req.params.id, req.body)); } catch (e) { next(e); }
});

export default router;
