// Program AI1 — API Surface.
//
// Dedicated, properly tenant-guarded router (mounted in routes/index.ts with
// requireTenantContext()/requireCapability(), unlike the pre-existing
// /outcomes router which has no such guards — see routes/index.ts). Read
// access only over data already exposed by ../lib/ai-value-attribution.

import { Router } from 'express';
import { aiValueAttributionService } from '../lib/ai-value-attribution/ai-value-attribution-service';
import { aiValueAttributionRepository } from '../lib/ai-value-attribution/ai-value-attribution-repository';
import { getOutcomeAttributionReadiness } from '../lib/ai-value-attribution/outcome-attribution-readiness-authority';

const router = Router();

const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json({ attributions: await aiValueAttributionRepository.listAttributions(tenant(req), req.query as any) }); } catch (e) { next(e); }
});

router.get('/readiness', async (req, res, next) => {
  try { res.json(await getOutcomeAttributionReadiness(tenant(req))); } catch (e) { next(e); }
});

router.get('/evidence', async (req, res, next) => {
  try {
    const attributionId = req.query.attributionId as string | undefined;
    if (!attributionId) { res.status(400).json({ error: 'ATTRIBUTION_ID_REQUIRED' }); return; }
    res.json({ evidence: await aiValueAttributionService.listEvidence(tenant(req), attributionId) });
  } catch (e) { next(e); }
});

router.get('/lineage', async (req, res, next) => {
  try {
    const attributionId = req.query.attributionId as string | undefined;
    if (!attributionId) { res.status(400).json({ error: 'ATTRIBUTION_ID_REQUIRED' }); return; }
    res.json(await aiValueAttributionService.getAttributionLineage(tenant(req), attributionId));
  } catch (e) { next(e); }
});

export default router;
