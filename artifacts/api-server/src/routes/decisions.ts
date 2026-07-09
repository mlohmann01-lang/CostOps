import { Router } from 'express';
import { decisionAuthorityService } from '../lib/decision-authority/decision-authority-service';

const router = Router();
const tenant = (req: any) => req.__authContext?.tenantId ?? req.headers['x-tenant-id'] ?? req.query.tenantId ?? 'default';

router.get('/', async (req, res, next) => {
  try { res.json(await decisionAuthorityService.listDecisions(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const decision = await decisionAuthorityService.getDecision(tenant(req), req.params.id);
    if (!decision) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(decision);
  } catch (e) { next(e); }
});
router.get('/:id/lineage', async (req, res, next) => {
  try { res.json(await decisionAuthorityService.getDecisionLineage(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/:id/assets', async (req, res, next) => {
  try { res.json(await decisionAuthorityService.getDecisionLineage(tenant(req), req.params.id).then((l) => l.assets)); } catch (e) { next(e); }
});
router.get('/:id/evidence', async (req, res, next) => {
  try { res.json(await decisionAuthorityService.getDecisionLineage(tenant(req), req.params.id).then((l) => l.evidence)); } catch (e) { next(e); }
});
router.get('/:id/principals', async (req, res, next) => {
  try { res.json(await decisionAuthorityService.getDecisionLineage(tenant(req), req.params.id).then((l) => l.principals)); } catch (e) { next(e); }
});
router.get('/:id/outcomes', async (req, res, next) => {
  try { res.json(await decisionAuthorityService.getDecisionLineage(tenant(req), req.params.id).then((l) => l.outcomes)); } catch (e) { next(e); }
});

export default router;
