import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, m365ConnectorConfigsTable, operatorActivityEventsTable, pilotProfilesTable } from "@workspace/db";
import { requireCapability, requireTenantContext } from "../middleware/security-guards";
import { PilotReadinessService } from "../lib/pilot-readiness-service";
import { SupportDiagnosticsService } from "../lib/support-diagnostics-service";
import { TenantProvisioningService } from "../lib/tenant-provisioning-service";

const router = Router();
const readinessService = new PilotReadinessService();
const supportService = new SupportDiagnosticsService();
const provisioningService = new TenantProvisioningService();
const tenant = (req: any) => String(req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

router.post("/provision/tenant", requireTenantContext(), requireCapability("MANAGE_TENANT_SETTINGS"), async (req, res) => res.json(await provisioningService.provision({ ...req.body, actorId: String(req.header("x-user-id") ?? "system") })));
router.get("/pilot/readiness", requireTenantContext(), requireCapability("READ_TELEMETRY"), async (req, res) => { const out = await readinessService.evaluate(tenant(req)); await db.insert(operatorActivityEventsTable).values({ tenantId: tenant(req), operatorId: String(req.header("x-user-id") ?? "system"), activityType: "READINESS_EVALUATED", targetType: "TENANT", targetId: tenant(req), activityMetadata: out as any }); res.json(out); });
router.get("/support/diagnostics", requireTenantContext(), requireCapability("READ_AUDIT"), async (req, res) => { const out = await supportService.getDiagnostics(tenant(req)); await db.insert(operatorActivityEventsTable).values({ tenantId: tenant(req), operatorId: String(req.header("x-user-id") ?? "system"), activityType: "SUPPORT_DIAGNOSTICS_ACCESSED", targetType: "TENANT", targetId: tenant(req), activityMetadata: { scope: "TENANT" } }); res.json(out); });
router.get("/pilot/profile", requireTenantContext(), requireCapability("MANAGE_TENANT_SETTINGS"), async (req,res)=>{ const [row] = await db.select().from(pilotProfilesTable).where(eq(pilotProfilesTable.tenantId, tenant(req))).limit(1); res.json(row ?? null); });
router.post("/pilot/profile", requireTenantContext(), requireCapability("MANAGE_TENANT_SETTINGS"), async (req,res)=>{ const [row] = await db.insert(pilotProfilesTable).values({ tenantId: tenant(req), ...req.body }).onConflictDoUpdate({ target: pilotProfilesTable.tenantId, set: { ...req.body, updatedAt: new Date() } }).returning(); await db.insert(operatorActivityEventsTable).values({ tenantId: tenant(req), operatorId: String(req.header("x-user-id") ?? "system"), activityType: "PILOT_PROFILE_UPDATED", targetType: "TENANT", targetId: tenant(req), activityMetadata: { keys: Object.keys(req.body ?? {}) } }); res.json(row); });
router.get("/connectors/m365/onboarding-checklist", requireTenantContext(), requireCapability("READ_CONNECTORS"), async (req,res)=>{ const [config] = await db.select().from(m365ConnectorConfigsTable).where(eq(m365ConnectorConfigsTable.tenantId, tenant(req))).limit(1); const enabled = !!config; res.json({ tenantId: tenant(req), stages: [{key:"graph_permissions",label:"Graph permissions configured",completed:enabled},{key:"admin_consent",label:"Admin consent completed",completed:enabled},{key:"readonly_validation",label:"Read-only validation passed",completed:enabled},{key:"connector_health",label:"Connector health healthy",completed:enabled},{key:"trust_snapshots",label:"Trust snapshots available",completed:enabled},{key:"reconciliation_review",label:"Reconciliation findings reviewed",completed:false},{key:"recommendations_generated",label:"Recommendations generated",completed:false}] }); });

export default router;
