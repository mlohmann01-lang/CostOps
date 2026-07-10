import { Router } from 'express';
import { aiValueAttributionService } from '../lib/ai-value-attribution/ai-value-attribution-service';

const router = Router();
// Program AI1 tenant-isolation fix: req.tenantId is set exclusively by requireTenantContext()
// from the authenticated session; never fall back to a client-supplied header/query/default.
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/activities', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.listActivities(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/activities', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.createAIActivity({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/activities/:id', async (req, res, next) => {
  try {
    const activity = await aiValueAttributionService.getActivityById(tenant(req), req.params.id);
    if (!activity) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(activity);
  } catch (e) { next(e); }
});
router.get('/attributions', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.listAttributions(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/attributions', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.createAttribution({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/attributions/:id', async (req, res, next) => {
  try {
    const attribution = await aiValueAttributionService.getAttributionById(tenant(req), req.params.id);
    if (!attribution) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(attribution);
  } catch (e) { next(e); }
});
router.get('/workflows/:id/value', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.getWorkflowAIValue(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/investments/:id/value', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.getInvestmentAIValue(tenant(req), req.params.id)); } catch (e) { next(e); }
});

// ─── Program AI1 — Multi-Source Attribution ────────────────────────────────
router.get('/attributions/:id/contributors', async (req, res, next) => {
  try { res.json({ contributors: await aiValueAttributionService.listContributors(tenant(req), req.params.id) }); } catch (e) { next(e); }
});
router.put('/attributions/:id/contributors', async (req, res, next) => {
  try { res.json({ contributors: await aiValueAttributionService.setContributors(tenant(req), req.params.id, req.body.contributors ?? []) }); } catch (e) { next(e); }
});

// ─── Program AI1 — Attribution Evidence Registry ───────────────────────────
router.get('/attributions/:id/evidence', async (req, res, next) => {
  try { res.json({ evidence: await aiValueAttributionService.listEvidence(tenant(req), req.params.id) }); } catch (e) { next(e); }
});
router.post('/attributions/:id/evidence', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.addEvidence(tenant(req), req.params.id, req.body)); } catch (e) { next(e); }
});

// ─── Program AI1 — Attribution Confidence Engine ───────────────────────────
router.post('/attributions/:id/confidence/recompute', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.recomputeConfidence(tenant(req), req.params.id, req.body?.signalStable, req.body?.timeCorrelationHours)); } catch (e) { next(e); }
});

// ─── Program AI1 — Attribution Lineage ─────────────────────────────────────
router.get('/attributions/:id/lineage', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.getAttributionLineage(tenant(req), req.params.id)); } catch (e) { next(e); }
});

// ─── Program AI1 — Attribution Decision Framework ──────────────────────────
router.get('/attributions/:id/decision', async (req, res, next) => {
  try { res.json(await aiValueAttributionService.recommendAttributionAction(tenant(req), req.params.id, req.query.signalStable === undefined ? undefined : req.query.signalStable === 'true')); } catch (e) { next(e); }
});

export default router;
