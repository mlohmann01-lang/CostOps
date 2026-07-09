import { Router } from 'express';
import { aiInitiativePortfolioService } from '../lib/ai-initiative-portfolio/ai-initiative-portfolio-service';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/initiatives', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.listInitiatives(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/initiatives', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.createInitiative({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/initiatives/:id', async (req, res, next) => {
  try {
    const initiative = await aiInitiativePortfolioService.getInitiative(tenant(req), req.params.id);
    if (!initiative) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(initiative);
  } catch (e) { next(e); }
});
router.get('/initiatives/:id/lineage', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.getInitiativeLineage(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/portfolio-summary', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.getPortfolioSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/top-initiatives', async (req, res, next) => {
  try { res.json(await aiInitiativePortfolioService.getTopInitiatives(tenant(req), req.query.limit ? Number(req.query.limit) : undefined)); } catch (e) { next(e); }
});

export default router;
