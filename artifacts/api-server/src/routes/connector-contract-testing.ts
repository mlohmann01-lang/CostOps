import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express';
import { connectorContractCertificationService, connectorContractHarness, connectorContractFixtures, runConnectorContractTestingAudit } from '../lib/connector-contract-testing';

const router: IRouter = Router();
const ok = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res)).catch(next);

router.get('/fixtures', ok(async (_req, res) => res.json(connectorContractFixtures)));
router.get('/fixtures/:connectorKey', ok(async (req, res) => res.json(connectorContractHarness.getFixturesForConnector(String(req.params.connectorKey)))));
router.post('/run/fixture/:fixtureId', ok(async (req, res) => res.json(await connectorContractHarness.runFixture(String(req.params.fixtureId)))));
router.post('/run/connector/:connectorKey', ok(async (req, res) => res.json(await connectorContractHarness.runConnector(String(req.params.connectorKey)))));
router.post('/run/family/:connectorFamily', ok(async (req, res) => res.json(await connectorContractHarness.runConnectorFamily(String(req.params.connectorFamily)))));
router.post('/run/all', ok(async (_req, res) => res.json(await connectorContractHarness.runAll())));
router.post('/certify/connector/:connectorKey', ok(async (req, res) => res.json(await connectorContractCertificationService.certifyConnector(String(req.params.connectorKey)))));
router.post('/certify/family/:connectorFamily', ok(async (req, res) => res.json(await connectorContractCertificationService.certifyConnectorFamily(String(req.params.connectorFamily)))));
router.post('/certify/all', ok(async (_req, res) => res.json(await connectorContractCertificationService.certifyAllConnectors())));
router.get('/audit', ok(async (_req, res) => res.json(await runConnectorContractTestingAudit())));

export default router;
