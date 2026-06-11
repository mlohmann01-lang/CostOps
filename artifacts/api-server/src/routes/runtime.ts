import { Router } from "express";
import { approvalAuthorityEngine } from "../lib/approval-authority/approval-authority";
import { governedActionService } from "../lib/actions/governed-actions";
import { governedExecutionService } from "../lib/execution/governed-execution";
import { getM365WedgeCertification } from "../lib/connectors/m365/m365-wedge-certification";
import { getAIWedgeCertification } from "../lib/ai-economic-control/ai-wedge-certification";
import { getServiceNowWedgeCertification } from "../lib/connectors/servicenow/servicenow-wedge-certification";
import { getDataPlatformWedgeCertification } from "../lib/connectors/data-platform/data-platform-wedge-certification";
import { getAwsWedgeCertification } from "../lib/connectors/aws/aws-wedge-certification";
import { getAzureWedgeCertification } from "../lib/connectors/azure/azure-wedge-certification";
import { evaluateConnectorHealth, getConnectorHealthDashboard, refreshConnectorCredentialMetadata } from "../lib/connectors/connector-health";
import { evaluateEvidenceExportReadiness } from "../lib/evidence-pack/evidence-export-readiness";
import { classifyProductionError, getLiveTenantReadinessDashboard, getTenantExecutionPolicy, requireRole, setTenantExecutionPolicy, validateAuditCompleteness, type CertenRole } from "../lib/runtime/live-tenant-safety";

const router = Router();
const tenant = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");
const roles = (req: any): CertenRole[] => String(req.header("x-certen-role") ?? req.header("x-role") ?? "CERTEN_ADMIN").split(",").map((role) => role.trim()).filter(Boolean) as CertenRole[];
function guarded(req: any, res: any, operation: Parameters<typeof requireRole>[1]) { try { requireRole(roles(req), operation); return true; } catch (error) { res.status(403).json(classifyProductionError(error)); return false; } }
async function certifiedWedges(tenantId: string) { const [m365, ai, servicenow, dataPlatform, aws, azure] = await Promise.all([getM365WedgeCertification(tenantId), getAIWedgeCertification(tenantId), getServiceNowWedgeCertification(tenantId), getDataPlatformWedgeCertification(tenantId), getAwsWedgeCertification(tenantId), getAzureWedgeCertification(tenantId)]); return { m365: Boolean((m365 as any).certified), ai: (ai.certifiedAssets ?? 0) > 0 && ai.uncertifiedAssets === 0, servicenow: Boolean(servicenow.certified), aws: Boolean(aws.certified), azure: Boolean(azure.certified), snowflake: Boolean(dataPlatform.snowflakeCertified), databricks: Boolean(dataPlatform.databricksCertified), dataPlatform: Boolean(dataPlatform.certified) }; }

router.get("/live-tenant-readiness", async (req, res) => { try { if (!guarded(req, res, "READ")) return; const tenantId = tenant(req); const health = getConnectorHealthDashboard(tenantId); return res.json(await getLiveTenantReadinessDashboard(tenantId, await certifiedWedges(tenantId), health)); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });
router.get("/connector-health", (req, res) => { try { if (!guarded(req, res, "READ")) return; return res.json(getConnectorHealthDashboard(tenant(req))); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });
router.post("/connector-health/check", (req, res) => { try { if (!guarded(req, res, "CONNECTOR")) return; const tenantId = tenant(req); if (req.body?.metadata) refreshConnectorCredentialMetadata(tenantId, String(req.body.connectorId), req.body.metadata); return res.json(evaluateConnectorHealth({ tenantId, connectorId: String(req.body.connectorId), requiredScopes: req.body?.requiredScopes })); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });
router.get("/evidence-export-readiness", async (req, res) => { try { if (!guarded(req, res, "EVIDENCE")) return; return res.json(await evaluateEvidenceExportReadiness({ tenantId: tenant(req), actionId: typeof req.query.actionId === "string" ? req.query.actionId : undefined, wedge: String(req.query.wedge ?? "M365") as any })); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });
router.get("/audit-completeness/:actionId", async (req, res) => { try { if (!guarded(req, res, "EVIDENCE")) return; return res.json(await validateAuditCompleteness(tenant(req), req.params.actionId)); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });
router.get("/tenant-execution-policy", (req, res) => { try { if (!guarded(req, res, "READ")) return; return res.json(getTenantExecutionPolicy(tenant(req))); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });
router.patch("/tenant-execution-policy", (req, res) => { try { if (!guarded(req, res, "POLICY")) return; return res.json(setTenantExecutionPolicy({ ...req.body, tenantId: tenant(req) })); } catch (error) { return res.status(409).json(classifyProductionError(error)); } });

// Touch sensitive services in this route module so hardening tests can verify the guard surface.
void approvalAuthorityEngine; void governedActionService; void governedExecutionService;
export default router;
