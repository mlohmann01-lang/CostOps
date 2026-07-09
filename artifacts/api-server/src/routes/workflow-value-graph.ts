import { Router } from 'express';
import { workflowValueGraphService } from '../lib/workflow-value-graph/workflow-value-graph-service';

const router = Router();
const tenant = (req: any) => req.__authContext?.tenantId ?? req.headers['x-tenant-id'] ?? req.query.tenantId ?? 'default';

router.get('/workflows', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.listWorkflows(tenant(req), req.query as any)); } catch (e) { next(e); }
});
router.post('/workflows', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.createWorkflow({ ...req.body, tenantId: tenant(req) })); } catch (e) { next(e); }
});
router.get('/workflows/:id', async (req, res, next) => {
  try {
    const workflow = await workflowValueGraphService.getWorkflowById(tenant(req), req.params.id);
    if (!workflow) { res.status(404).json({ error: 'NOT_FOUND' }); return; }
    res.json(workflow);
  } catch (e) { next(e); }
});
router.get('/workflows/:id/graph', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.getWorkflowGraph(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.get('/workflows/:id/lineage', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.getWorkflowLineage(tenant(req), req.params.id)); } catch (e) { next(e); }
});
router.post('/workflows/:id/assets', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.linkWorkflowToAsset(tenant(req), req.params.id, req.body.assetId, req.body.relationshipType, req.body.confidence)); } catch (e) { next(e); }
});
router.post('/workflows/:id/principals', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.linkWorkflowToPrincipal(tenant(req), req.params.id, req.body.principalId, req.body.relationshipType, req.body.confidence)); } catch (e) { next(e); }
});
router.post('/workflows/:id/decisions', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.linkWorkflowToDecision(tenant(req), req.params.id, req.body.decisionId, req.body.relationshipType, req.body.confidence)); } catch (e) { next(e); }
});
router.post('/workflows/:id/outcomes', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.linkWorkflowToOutcome(tenant(req), req.params.id, req.body.outcomeId, req.body.relationshipType, req.body.confidence)); } catch (e) { next(e); }
});
router.post('/workflows/:id/investments', async (req, res, next) => {
  try { res.json(await workflowValueGraphService.linkWorkflowToInvestment(tenant(req), req.params.id, req.body.investmentId, req.body.relationshipType, req.body.confidence)); } catch (e) { next(e); }
});

export default router;
