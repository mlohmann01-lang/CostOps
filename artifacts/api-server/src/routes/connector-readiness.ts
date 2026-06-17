import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import { runConnectorReadinessAudit, connectorReadinessService as svc } from '../lib/connector-readiness';

const router: IRouter = Router();
const tenant = (req: Request) => String((req as any).tenantId ?? req.header('x-tenant-id') ?? req.query?.tenantId ?? req.body?.tenantId ?? 'default');
const ok = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

router.post('/manifests/register-defaults', ok(async (_req, res) => res.json(await svc.registerDefaultManifests())));
router.get('/manifests', ok(async (req, res) => res.json(await svc.repo.listManifests(req.query))));
router.get('/manifests/:connectorKey', ok(async (req, res) => res.json(await svc.repo.getManifest(String(req.params.connectorKey)))));
router.post('/configs', ok(async (req, res) => res.json(await svc.configureConnector(tenant(req), req.body))));
router.get('/configs', ok(async (req, res) => res.json(await svc.repo.listConfigs(tenant(req), req.query))));
router.post('/health/:connectorKey', ok(async (req, res) => res.json(await svc.evaluateConnectorHealth(tenant(req), String(req.params.connectorKey)))));
router.get('/health', ok(async (req, res) => res.json(await svc.repo.listHealthChecks(tenant(req), req.query))));
router.post('/dry-run/:connectorKey', ok(async (req, res) => res.json(await svc.runDryRun(tenant(req), String(req.params.connectorKey)))));
router.get('/dry-runs', ok(async (req, res) => res.json(await svc.repo.listDryRuns(tenant(req), req.query))));
router.post('/validate/:connectorKey/:contractType', ok(async (req, res) => res.json(await svc.validateOutputContract(tenant(req), String(req.params.connectorKey), String(req.params.contractType), req.body?.sampleRecords ?? []))));
router.get('/validation-results', ok(async (req, res) => res.json(await svc.repo.listValidationResults(tenant(req), req.query))));
router.post('/graph-preview/:connectorKey/:outputContract', ok(async (req, res) => res.json(await svc.previewGraphMapping(tenant(req), String(req.params.connectorKey), String(req.params.outputContract)))));
router.get('/graph-mappings', ok(async (req, res) => res.json(await svc.repo.listGraphMappings(tenant(req), req.query))));
router.post('/evidence/:connectorKey/:evidenceType', ok(async (req, res) => res.json(await svc.generateConnectorEvidence(tenant(req), String(req.params.connectorKey), String(req.params.evidenceType) as any))));
router.get('/evidence', ok(async (req, res) => res.json(await svc.repo.listEvidenceOutputs(tenant(req), req.query))));
router.get('/summary', ok(async (req, res) => res.json(await svc.summariseConnectorReadiness(tenant(req)))));
router.get('/families/:connectorFamily/summary', ok(async (req, res) => res.json(await svc.summariseConnectorFamilyReadiness(tenant(req), String(req.params.connectorFamily) as any))));
router.get('/audit', ok(async (_req, res) => res.json(await runConnectorReadinessAudit())));

export default router;
