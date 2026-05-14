import { Router } from "express";
import { getOperatorWorkbenchSummary } from "../lib/enterprise/operator-workbench";
import { getEvidenceExplorer } from "../lib/enterprise/evidence-explorer";
import { getExecutiveDashboard } from "../lib/enterprise/executive-dashboard";
import { getConnectorOperationsConsole } from "../lib/enterprise/connector-operations-console";
import { getValueRealizationAnalytics } from "../lib/enterprise/value-realization-analytics";

const router = Router();
router.get("/operator-workbench", async (req, res) => res.json(await getOperatorWorkbenchSummary((req.query.tenantId as string) ?? "default")));
router.get("/evidence-explorer", async (req, res) => res.json(await getEvidenceExplorer((req.query.tenantId as string) ?? "default")));
router.get("/evidence", async (req, res) => res.json(await getEvidenceExplorer((req.query.tenantId as string) ?? "default")));
router.get("/executive-dashboard", async (req, res) => res.json(await getExecutiveDashboard((req.query.tenantId as string) ?? "default")));
router.get("/connector-operations", async (_req, res) => res.json(await getConnectorOperationsConsole()));
router.get("/value-realization", async (req, res) => res.json(await getValueRealizationAnalytics((req.query.tenantId as string) ?? "default")));
export default router;
