import { Router } from 'express';
import { aiValueGraphService } from '../lib/ai-value-graph/ai-value-graph-service';
import { getAIValueGraphAuthority } from '../lib/ai-value-graph/ai-value-graph-authority';

const router = Router();
const tenant = (req: any): string => {
  const tenantId = req.tenantId;
  if (typeof tenantId !== 'string' || tenantId.length === 0) throw Object.assign(new Error('TENANT_CONTEXT_REQUIRED'), { statusCode: 400 });
  return tenantId;
};

router.get('/', async (req, res, next) => {
  try { res.json(await aiValueGraphService.getGraph(tenant(req))); } catch (e) { next(e); }
});
router.get('/authority', async (req, res, next) => {
  try { res.json(await getAIValueGraphAuthority(tenant(req))); } catch (e) { next(e); }
});
router.get('/gaps', async (req, res, next) => {
  try { res.json(await aiValueGraphService.getGraphGaps(tenant(req))); } catch (e) { next(e); }
});
router.get('/summary', async (req, res, next) => {
  try { res.json(await aiValueGraphService.getExecutiveGraphSummary(tenant(req))); } catch (e) { next(e); }
});
router.get('/initiatives/:initiativeId', async (req, res, next) => {
  try { res.json(await aiValueGraphService.getInitiativeValuePath(tenant(req), req.params.initiativeId)); } catch (e) { next(e); }
});
router.get('/assets/:assetId', async (req, res, next) => {
  try { res.json(await aiValueGraphService.getWhyAssetExists(tenant(req), req.params.assetId)); } catch (e) { next(e); }
});
router.get('/objectives/:objectiveId', async (req, res, next) => {
  try { res.json(await aiValueGraphService.getObjectiveSupportPath(tenant(req), req.params.objectiveId)); } catch (e) { next(e); }
});

export default router;
