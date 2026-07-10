import { Router } from 'express';
import { valueRealisationAuthorityService } from '../lib/value-realisation/value-realisation-service';

const router = Router();
const tenant = (req: any) => req.tenantId ?? req.headers['x-tenant-id'] ?? req.query.tenantId ?? 'default';

router.get('/investments', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.listInvestments(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/investments', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.createInvestment({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/investments/:id', async (req, res, next) => {
  try {
    const investment = await valueRealisationAuthorityService.getInvestmentById(tenant(req), req.params.id);
    if (!investment) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(investment);
  } catch (e) { next(e); }
});
router.get('/investments/:id/summary', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.getInvestmentValueSummary(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/investments/:id/lineage', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.getInvestmentLineage(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.post('/investments/:id/capabilities', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.linkInvestmentToCapability(tenant(req), req.params.id, req.body.capabilityId, req.body.relationshipType ?? 'SUPPORTS', req.body)); } catch (e) { next(e); }
});
router.post('/investments/:id/assets', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.linkInvestmentToAsset(tenant(req), req.params.id, req.body.assetId, req.body.relationshipType ?? 'USES', req.body)); } catch (e) { next(e); }
});
router.post('/investments/:id/decisions', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.attachDecisionToInvestment(tenant(req), req.params.id, req.body.decisionId, req.body.metadata ?? {})); } catch (e) { next(e); }
});
router.get('/investments/:id/decisions', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.getDecisionsForInvestment(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.post('/investments/:id/attributions', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.createValueAttribution({ ...req.body, tenantId: tenant(req), investmentId: req.params.id })); } catch (e) { next(e); }
});

router.get('/capabilities', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.repo.listCapabilities(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/capabilities', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.createOrUpdateBusinessCapability({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/capabilities/:id', async (req, res, next) => {
  try {
    const capability = await valueRealisationAuthorityService.repo.getCapability(tenant(req), req.params.id);
    if (!capability) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(capability);
  } catch (e) { next(e); }
});

router.post('/signals', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.createValueSignal({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/investments/:id/signals', async (req, res, next) => {
  try { res.json(await valueRealisationAuthorityService.repo.listSignals(tenant(req), { investmentId: req.params.id })); } catch (e) { next(e); }
});

export default router;
