import { Router } from "express";
import { buildM365WedgeCertification } from "../lib/connectors/m365/m365-wedge-certification";
import { getServiceNowWedgeCertification } from "../lib/connectors/servicenow/servicenow-wedge-certification";
import { getDataPlatformWedgeCertification } from "../lib/connectors/data-platform/data-platform-wedge-certification";
import { getAwsWedgeCertification } from "../lib/connectors/aws/aws-wedge-certification";
import { getAzureWedgeCertification } from "../lib/connectors/azure/azure-wedge-certification";
import { db } from "@workspace/db";
import { connectorsTable, connectorSyncStatusTable, m365UsersTable, flexeraEntitlementsTable, servicenowAssetsTable, servicenowContractsTable, m365ConnectorConfigsTable, m365EvidenceRecordsTable, recommendationsTable, outcomeLedgerTable, type Connector } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { checkM365PermissionReadiness } from "../lib/connectors/m365/m365-permission-check";
import { fetchGraphUserActivity, fetchGraphUserLicences, fetchGraphUsersFirstPage, getGraphAccessToken } from "../lib/connectors/m365/m365-graph-client";
import { normalizeM365Users } from "../lib/connectors/m365-normalizer";
import { ingestM365Tenant } from "../lib/connectors/m365-ingestion";
import { checkFlexeraReadiness } from "../lib/connectors/flexera/flexera-readiness";
import { ingestFlexeraTenant } from "../lib/connectors/flexera/flexera-ingestion";
import { checkServiceNowReadiness } from "../lib/connectors/servicenow/servicenow-readiness";
import { ingestServiceNowTenant } from "../lib/connectors/servicenow/servicenow-ingestion";
import { M365ReadOnlySyncService } from "../lib/connectors/m365/m365-read-only-sync-service";
import { M365ReadOnlyEvidenceSyncService } from "../lib/connectors/m365/m365-readonly-evidence-sync-service";
import { generateM365Recommendations, type M365SkuPricing } from "../lib/connectors/m365/m365-recommendation-generator";
import { M365DisabledUserReclaimSliceService } from "../lib/connectors/m365/m365-disabled-user-reclaim-slice";
import { evaluateM365LiveExecutionReadiness } from "../lib/connectors/m365/m365-live-execution-readiness-gate";
import { PlaybookRecommendationService } from "../lib/playbooks/playbook-recommendation-service";
import { ConnectorTrustService } from "../lib/connectors/m365/connector-trust-service";
import { EvidenceReconciliationService } from "../lib/connectors/m365/evidence-reconciliation-service";
import { M365_PRODUCTION_FAILURE_MATRIX, M365_PRODUCTION_REQUIRED_SCOPES, buildTenantReadinessReport } from "../lib/connectors/m365/m365-production-validation";
import { checkM365Readiness } from "../lib/connectors/m365/m365-readiness";
import { m365DiscoveryService } from "../lib/connectors/m365/m365-discovery-service";
import { m365SnapshotRepository } from "../lib/connectors/m365/m365-snapshot-repository";
import { m365HealthService } from "../lib/connectors/m365/m365-health";
import { m365TrustService } from "../lib/connectors/m365/m365-trust";
import { buildM365ProductionAuthorityConnector, getM365OnboardingExperience } from "../lib/connectors/m365/m365-production-authority";
import { getM365PlaybookHealth } from "../lib/playbooks/m365/m365-playbook-runtime";
import openaiConnectorRouter from "../lib/connectors/openai/openai-connector-routes.js";
import connectorSdkRouter from "./connector-sdk";

const router = Router();

const tenantFrom = (req: any) => String(req.tenantId ?? req.query.tenantId ?? req.header("x-tenant-id") ?? "default");

router.get("/m365/certification", async (req, res) => res.json(await buildM365WedgeCertification(tenantFrom(req))));
router.get("/servicenow/certification", async (req, res) => res.json(await getServiceNowWedgeCertification(tenantFrom(req))));
router.get("/data-platform/certification", async (req, res) => res.json(await getDataPlatformWedgeCertification(tenantFrom(req))));
router.get("/aws/certification", async (req, res) => res.json(await getAwsWedgeCertification(tenantFrom(req))));
router.get("/azure/certification", async (req, res) => res.json(await getAzureWedgeCertification(tenantFrom(req))));

router.use("/sdk", connectorSdkRouter);

router.get("/", async (req, res) => {
  try {
    const connectors = await db.select().from(connectorsTable).orderBy(connectorsTable.id);
    return res.json(
      connectors.map((c: Connector) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        lastSync: c.lastSync ? c.lastSync.toISOString() : null,
        recordCount: c.recordCount,
        trustScore: c.trustScore,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing connectors");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/sync", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [connector] = await db.select().from(connectorsTable).where(eq(connectorsTable.id, id));
    if (!connector) return res.status(404).json({ error: "Connector not found" });

    await db
      .update(connectorsTable)
      .set({ status: "syncing", lastSync: new Date() })
      .where(eq(connectorsTable.id, id));

    void setTimeout(async () => {
      await db
        .update(connectorsTable)
        .set({ status: "connected", recordCount: connector.recordCount + 1 })
        .where(eq(connectorsTable.id, id));
    }, 3000);

    const [updated] = await db.select().from(connectorsTable).where(eq(connectorsTable.id, id));
    return res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      status: updated.status,
      lastSync: updated.lastSync ? updated.lastSync.toISOString() : null,
      recordCount: updated.recordCount,
      trustScore: updated.trustScore,
    });
  } catch (err) {
    req.log.error({ err }, "Error syncing connector");
    return res.status(500).json({ error: "Internal server error" });
  }
});


router.get("/m365/authority/onboarding", (_req, res) => {
  return res.json({ connectorId: "m365", flow: getM365OnboardingExperience() });
});

router.get("/m365/authority/capabilities", (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  return res.json(buildM365ProductionAuthorityConnector(tenantId).capabilities());
});

router.post("/m365/authority/connect", async (req, res) => {
  try {
    const body = (req.body ?? {}) as { authorizationCode?: string; redirectUri?: string; tenantId?: string; clientId?: string; clientSecret?: string; scopes?: string[] };
    const tenantId = body.tenantId ?? (req.query.tenantId as string) ?? "default";
    if (!body.clientId || !body.clientSecret) return res.status(400).json({ error: "M365_CLIENT_ID_AND_SECRET_REQUIRED" });
    if (body.authorizationCode && !body.redirectUri) return res.status(400).json({ error: "M365_REDIRECT_URI_REQUIRED_FOR_AUTHORIZATION_CODE" });
    return res.json(await buildM365ProductionAuthorityConnector(tenantId).connect({ tenantId, clientId: body.clientId, clientSecret: body.clientSecret, authorizationCode: body.authorizationCode, redirectUri: body.redirectUri, scopes: body.scopes }));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_AUTHORITY_CONNECT_FAILED" });
  }
});

router.post("/m365/authority/run", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const body = (req.body ?? {}) as { maxUsers?: number; perPage?: number; useCachedSnapshot?: boolean };
    const useCachedSnapshot = body.useCachedSnapshot === true && process.env.NODE_ENV !== "production";
    const run = await buildM365ProductionAuthorityConnector(tenantId).runEndToEnd({ maxUsers: body.maxUsers, perPage: body.perPage, skipDiscovery: useCachedSnapshot, actor: "api:m365-authority" });
    if (!run.productionGates.passed) return res.status(409).json(run);
    return res.json(run);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_AUTHORITY_RUN_FAILED" });
  }
});

router.get("/m365/readiness", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  const required = [...M365_PRODUCTION_REQUIRED_SCOPES];
  const checks: Array<{ id: string; label: string; status: string; detail: string }> = [];
  const configured = Boolean(process.env.M365_TENANT_ID && process.env.M365_CLIENT_ID && process.env.M365_CLIENT_SECRET);
  checks.push({ id: "GRAPH_CONFIGURED", label: "Graph configuration", status: configured ? "PASSED" : "FAILED", detail: configured ? "Tenant/client credentials configured." : "Missing M365_TENANT_ID / M365_CLIENT_ID / M365_CLIENT_SECRET." });
  if (!configured) {
    return res.json({ connectorId: "m365", status: "NOT_CONFIGURED", mode: "LIVE", capability: "READ_ONLY", tenantId, checks, permissions: { required, detected: [], missing: required }, lastCheckedAt: new Date().toISOString(), canSync: false, canSmokeTest: false, canExecute: false });
  }
  try {
    const readiness = await checkM365PermissionReadiness();
    checks.push({ id: "GRAPH_PERMISSION_READY", label: "Permission readiness", status: readiness.status === "READY" ? "PASSED" : readiness.status === "DEGRADED" ? "WARNING" : "FAILED", detail: readiness.warnings?.join('; ') || "Permission checks completed." });
    const status = readiness.status === "READY" ? "READY" : readiness.status === "DEGRADED" ? "DEGRADED" : "BLOCKED";
    return res.json({ connectorId: "m365", status, mode: "LIVE", capability: "READ_ONLY", tenantId, checks, permissions: { required, detected: required.filter((p) => !readiness.missingRequired.includes(p)), missing: readiness.missingRequired }, lastCheckedAt: new Date().toISOString(), canSync: status !== "BLOCKED", canSmokeTest: true, canExecute: false });
  } catch {
    checks.push({ id: "TOKEN_ACQUISITION", label: "Token acquisition", status: "FAILED", detail: "Graph token acquisition failed." });
    return res.json({ connectorId: "m365", status: "BLOCKED", mode: "LIVE", capability: "READ_ONLY", tenantId, checks, permissions: { required, detected: [], missing: required }, lastCheckedAt: new Date().toISOString(), canSync: false, canSmokeTest: true, canExecute: false });
  }
});



router.post("/m365/readiness/check", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    return res.json(await checkM365Readiness({ tenantId }));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_READINESS_FAILED" });
  }
});

router.post("/m365/discover", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    return res.status(202).json(await m365DiscoveryService.discover({ tenantId, maxUsers: Number((req.body ?? {}).maxUsers ?? 100), perPage: Number((req.body ?? {}).perPage ?? 100) }));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_DISCOVERY_FAILED" });
  }
});

router.get("/m365/discovery-runs", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  return res.json({ tenantId, runs: m365SnapshotRepository.listRuns(tenantId) });
});

router.get("/m365/snapshots/latest", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  const snapshot = m365SnapshotRepository.getLatest(tenantId);
  if (!snapshot) return res.status(404).json({ error: "M365_SNAPSHOT_NOT_FOUND", tenantId });
  return res.json(snapshot);
});

router.get("/m365/health", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    return res.json(await m365HealthService.getHealth(tenantId));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_HEALTH_FAILED" });
  }
});

router.get("/m365/trust/report", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    return res.json(await m365TrustService.generateTrustReport(tenantId));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_TRUST_FAILED" });
  }
});

router.get("/m365/users", (req, res) => { const tenantId = (req.query.tenantId as string) ?? "default"; return res.json({ tenantId, users: m365SnapshotRepository.listUsers(tenantId) }); });
router.get("/m365/licenses", (req, res) => { const tenantId = (req.query.tenantId as string) ?? "default"; return res.json({ tenantId, licenses: m365SnapshotRepository.listLicenses(tenantId) }); });
router.get("/m365/usage", (req, res) => { const tenantId = (req.query.tenantId as string) ?? "default"; return res.json({ tenantId, usage: m365SnapshotRepository.listUsage(tenantId) }); });
router.get("/m365/mailboxes", (req, res) => { const tenantId = (req.query.tenantId as string) ?? "default"; return res.json({ tenantId, mailboxes: m365SnapshotRepository.listMailboxes(tenantId) }); });

router.get("/m365/production-validation/readiness-report", async (req, res) => {
  const grantedScopes = String(process.env.M365_GRAPH_GRANTED_PERMISSIONS ?? "").split(/[\s,]+/).filter(Boolean);
  const token = await getGraphAccessToken();
  const graphReachable = Boolean(token.accessToken);
  const report = buildTenantReadinessReport({
    tokenAcquired: Boolean(token.accessToken),
    graphReachable,
    grantedScopes,
    errors: token.error ? [token.error] : [],
  });
  return res.json({ tenantId: (req.query.tenantId as string) ?? "default", report });
});

router.get("/m365/production-validation/failure-matrix", (_req, res) => {
  return res.json({ failureMatrix: M365_PRODUCTION_FAILURE_MATRIX });
});

router.post("/m365/sync", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const ingestion = await ingestM365Tenant(tenantId);

    await db.insert(connectorSyncStatusTable).values({
      tenantId,
      connector: ingestion.metadata.connector,
      lastSyncTime: new Date(ingestion.metadata.lastSyncTime),
      connectorHealth: ingestion.metadata.connectorHealth,
      dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
      freshnessBand: ingestion.metadata.freshnessBand,
      partialData: String(ingestion.metadata.partialData),
      errorCode: ingestion.metadata.errorCode ?? null,
      errorMessage: ingestion.metadata.errorMessage ?? null,
      requestId: ingestion.metadata.requestId,
    });

    for (const user of ingestion.users) {
      await db.insert(m365UsersTable).values({
        tenantId,
        sourceObjectId: user.userPrincipalName,
        userPrincipalName: user.userPrincipalName,
        displayName: user.displayName ?? null,
        accountEnabled: String(user.accountEnabled),
        assignedLicenses: user.assignedLicenses,
        lastLoginDaysAgo: user.lastLoginDaysAgo,
        sourceTimestamp: new Date(user.sourceTimestamp),
        ingestionRunId: ingestion.ingestionRunId,
        connectorHealth: ingestion.metadata.connectorHealth,
        dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
        freshnessBand: ingestion.metadata.freshnessBand,
        partialData: String(ingestion.metadata.partialData),
      }).onConflictDoUpdate({
        target: [m365UsersTable.tenantId, m365UsersTable.sourceObjectId],
        set: {
          userPrincipalName: user.userPrincipalName,
          displayName: user.displayName ?? null,
          accountEnabled: String(user.accountEnabled),
          assignedLicenses: user.assignedLicenses,
          lastLoginDaysAgo: user.lastLoginDaysAgo,
          sourceTimestamp: new Date(user.sourceTimestamp),
          ingestionRunId: ingestion.ingestionRunId,
          connectorHealth: ingestion.metadata.connectorHealth,
          dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
          freshnessBand: ingestion.metadata.freshnessBand,
          partialData: String(ingestion.metadata.partialData),
          updatedAt: new Date(),
        },
      });
    }

    const latest = await db.select().from(m365UsersTable).where(eq(m365UsersTable.tenantId, tenantId)).orderBy(desc(m365UsersTable.updatedAt));
    return res.json({
      tenantId,
      ingestionRunId: ingestion.ingestionRunId,
      connectorHealth: ingestion.metadata.connectorHealth,
      usersSynced: ingestion.users.length,
      canonicalUsers: latest.length,
      warnings: ingestion.warnings,
    });
  } catch (err) {
    req.log.error({ err }, "Error syncing m365 canonical users");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/smoke-test", async (_req, res) => {
  if ((process.env.M365_MODE ?? "MOCK_CONNECTOR") !== "LIVE_GRAPH") {
    return res.status(400).json({ status: "FAIL", errors: ["M365_MODE must be LIVE_GRAPH"], warnings: [] });
  }

  try {
    const readiness = await checkM365PermissionReadiness();
    if (readiness.status === "BLOCKED") {
      return res.status(200).json({
        status: "FAIL",
        readiness,
        connectorHealth: "FAILED",
        counts: { usersFetched: 0, licencesFetched: 0, activityFetched: 0, normalizedUsers: 0 },
        sample: [],
        warnings: readiness.warnings,
        errors: ["PERMISSION_BLOCKED"],
        requestIds: [],
      });
    }

    const warnings = [...readiness.warnings];
    const errors: string[] = [];
    const requestIds: string[] = [];
    let connectorHealth: "HEALTHY" | "DEGRADED" | "FAILED" = readiness.status === "DEGRADED" ? "DEGRADED" : "HEALTHY";

    const token = await getGraphAccessToken();
    if (!token.accessToken) {
      return res.status(200).json({
        status: "FAIL",
        readiness,
        connectorHealth: "FAILED",
        counts: { usersFetched: 0, licencesFetched: 0, activityFetched: 0, normalizedUsers: 0 },
        sample: [],
        warnings,
        errors: [token.error ?? "TOKEN_ERROR"],
        requestIds: token.requestId ? [token.requestId] : [],
      });
    }

    if (token.requestId) requestIds.push(token.requestId);

    const usersResult = await fetchGraphUsersFirstPage(token.accessToken);
    if (usersResult.requestId) requestIds.push(usersResult.requestId);
    const sampleUsers = usersResult.users.slice(0, 5);

    const licencesResult = await fetchGraphUserLicences(token.accessToken, sampleUsers);
    if (licencesResult.requestId) requestIds.push(licencesResult.requestId);

    let activityByUpn: Record<string, number | null> = {};
    let activityFetched = 0;
    try {
      const activityResult = await fetchGraphUserActivity(token.accessToken, sampleUsers);
      activityByUpn = activityResult.lastLoginDaysByUpn;
      activityFetched = Object.keys(activityByUpn).length;
      if (activityResult.requestId) requestIds.push(activityResult.requestId);
    } catch {
      connectorHealth = "DEGRADED";
      warnings.push("Activity fetch failed; partial data returned");
    }

    const merged = sampleUsers.map((u) => ({
      userPrincipalName: u.userPrincipalName,
      displayName: u.displayName,
      accountEnabled: Boolean(u.accountEnabled),
      assignedLicenses: licencesResult.licencesByUpn[u.userPrincipalName] ?? [],
      lastLoginDaysAgo: Object.prototype.hasOwnProperty.call(activityByUpn, u.userPrincipalName) ? activityByUpn[u.userPrincipalName] : null,
    }));

    const normalized = normalizeM365Users(process.env.M365_TENANT_ID ?? "unknown", merged, new Date().toISOString());
    const status = connectorHealth === "DEGRADED" ? "DEGRADED" : "PASS";
    const sample = normalized.slice(0, 3).map((u) => ({
      userPrincipalName: u.userPrincipalName.replace(/(^.).+(@.*$)/, "$1***$2"),
      accountEnabled: u.accountEnabled,
      assignedLicenceCount: u.assignedLicenses.length,
      lastLoginDaysAgo: u.lastLoginDaysAgo,
    }));

    return res.status(200).json({
      status,
      readiness,
      connectorHealth,
      counts: {
        usersFetched: usersResult.users.length,
        licencesFetched: Object.keys(licencesResult.licencesByUpn).length,
        activityFetched,
        normalizedUsers: normalized.length,
      },
      sample,
      warnings,
      errors,
      requestIds,
    });
  } catch (error) {
    return res.status(200).json({
      status: "FAIL",
      connectorHealth: "FAILED",
      counts: { usersFetched: 0, licencesFetched: 0, activityFetched: 0, normalizedUsers: 0 },
      sample: [],
      warnings: [],
      errors: [error instanceof Error ? error.message : "SMOKE_TEST_FAILED"],
      requestIds: [],
    });
  }
});

const m365ReadOnlySyncService = new M365ReadOnlySyncService();
const m365ReadOnlyEvidenceSyncService = new M365ReadOnlyEvidenceSyncService();
const playbookService = new PlaybookRecommendationService();
const trustService = new ConnectorTrustService();
const reconciliationService = new EvidenceReconciliationService();
const m365DisabledUserReclaimSliceService = new M365DisabledUserReclaimSliceService(m365ReadOnlyEvidenceSyncService);

router.get("/m365/status", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const status = await m365ReadOnlySyncService.getSyncStatus(tenantId);
    const playbookHealth = getM365PlaybookHealth(tenantId);
    return res.json({ ...(status ?? { connectorId: "m365", tenantId, status: "NEVER_SYNCED", summary: { usersScanned: 0, licensedUsers: 0, disabledLicensedUsers: 0, inactiveLicensedUsers: 0, skusSeen: 0, activityCoveragePercent: 0 }, stale: false, canGenerateRecommendations: false }), productionReadinessCounts: playbookHealth.productionReadinessCounts ?? { readyForApproval: 0, needsHardening: 0, notReady: 0 } });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/validate", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const [cfg] = await db.select().from(m365ConnectorConfigsTable).where(eq(m365ConnectorConfigsTable.tenantId, tenantId)).limit(1);
    if (!cfg) return res.status(404).json({ error: "M365 connector not configured" });
    if (cfg.mode !== "READ_ONLY") return res.status(400).json({ error: "Connector must be READ_ONLY" });
    return res.json({ ok: true, mode: cfg.mode, status: cfg.status });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/sync/read-only", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const result = await m365ReadOnlyEvidenceSyncService.runSync(tenantId);
    return res.json({ ...result.summary, evidenceSample: result.normalizedEvidence.slice(0, 10) });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "READ_ONLY_SYNC_FAILED" });
  }
});


router.post("/m365/recommendations/generate", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const body = (req.body ?? {}) as { normalizedEvidence?: unknown; skuPricingCatalog?: M365SkuPricing[]; generationOptions?: { inactivityDaysThreshold?: number; evidenceConfidenceThreshold?: number; confidenceAdjustment?: number } };
    const syncResult = Array.isArray(body.normalizedEvidence) ? null : await m365ReadOnlyEvidenceSyncService.runSync(tenantId);
    const normalizedEvidence = (Array.isArray(body.normalizedEvidence) ? body.normalizedEvidence : syncResult?.normalizedEvidence) ?? [];
    const generated = generateM365Recommendations({
      tenantId,
      normalizedEvidence: normalizedEvidence as Parameters<typeof generateM365Recommendations>[0]["normalizedEvidence"],
      skuPricingCatalog: Array.isArray(body.skuPricingCatalog) ? body.skuPricingCatalog : [],
      generationOptions: body.generationOptions,
    });

    let inserted = 0;
    let updated = 0;
    for (const rec of generated.recommendations) {
      const stableKey = `${tenantId}:${rec.affectedUser.userPrincipalName}:${rec.recommendationType}:${[...rec.affectedLicenses].sort().join(',')}`;
      const [existing] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.tenantId, tenantId), eq(recommendationsTable.correlationId, stableKey))).limit(1);
      const patch = {
        userEmail: rec.affectedUser.userPrincipalName,
        displayName: rec.affectedUser.displayName,
        licenceSku: rec.affectedLicenses.join(','),
        monthlyCost: rec.projectedMonthlySavings,
        annualisedCost: rec.projectedAnnualSavings,
        trustScore: rec.trustLevel === 'HIGH' ? 90 : rec.trustLevel === 'MEDIUM' ? 70 : 50,
        executionStatus: rec.approvalRequirement === 'REQUIRED' ? 'APPROVAL_REQUIRED' : 'DRY_RUN_READY',
        status: 'pending',
        playbook: rec.recommendationType,
        playbookId: rec.playbookId,
        playbookName: rec.playbookId,
        playbookEvidence: { proofReferences: rec.proofReferences, confidenceReasoning: rec.confidenceReasoning, utilizationReasoning: rec.utilizationReasoning },
        connector: 'm365',
        connectorHealth: rec.evidenceFreshness === 'FRESH' ? 'HEALTHY' : 'DEGRADED',
        freshnessBand: rec.evidenceFreshness,
        actionType: 'REMOVE_LICENSE',
        targetEntityId: rec.affectedUser.userId,
        expectedMonthlySaving: rec.projectedMonthlySavings,
        expectedAnnualSaving: rec.projectedAnnualSavings,
        recommendationRiskClass: rec.blastRadiusClass,
        recommendationExecutionMode: rec.approvalRequirement === 'REQUIRED' ? 'APPROVAL_REQUIRED' : 'DRY_RUN_ONLY',
        recommendationStatus: 'CANDIDATE',
        correlationId: stableKey,
      } as const;
      let recommendationId = 0;
      if (existing) {
        const [saved] = await db.update(recommendationsTable).set({ ...patch, updatedAt: new Date() }).where(eq(recommendationsTable.id, existing.id)).returning({ id: recommendationsTable.id });
        recommendationId = saved.id;
        updated += 1;
      } else {
        const [saved] = await db.insert(recommendationsTable).values(patch as any).returning({ id: recommendationsTable.id });
        recommendationId = saved.id;
        inserted += 1;
      }
      await db.insert(outcomeLedgerTable).values({
        tenantId,
        recommendationId,
        userEmail: rec.affectedUser.userPrincipalName,
        displayName: rec.affectedUser.displayName,
        action: 'PROJECTED_ONLY',
        licenceSku: rec.affectedLicenses.join(','),
        beforeCost: rec.projectedMonthlySavings,
        afterCost: 0,
        monthlySaving: rec.projectedMonthlySavings,
        annualisedSaving: rec.projectedAnnualSavings,
        approved: false,
        executed: false,
        executionMode: 'DRY_RUN_ONLY',
        savingConfidence: 'ESTIMATED',
        evidence: { source: 'M365_GENERATOR', recommendationType: rec.recommendationType, verifiedMonthlySavings: 0, verificationState: 'PROJECTED_ONLY' },
        executionStatus: 'PROJECTED',
      });
    }

    return res.json({
      tenantId,
      syncSummary: syncResult?.summary ?? null,
      recommendations: generated.recommendations,
      summary: generated.summary,
      generated: inserted,
      updated,
      persisted: true,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_RECOMMENDATION_GENERATION_FAILED" });
  }
});



router.get("/m365/live-execution/readiness", async (req, res) => {
  const tenantId = (req.query.tenantId as string) ?? "default";
  const mode = process.env.ECON_OPS_TENANT_MODE ?? "PILOT_READ_ONLY";
  const grantedScopes = String(process.env.M365_GRAPH_GRANTED_PERMISSIONS ?? "").split(/\s+/).filter(Boolean);
  const report = evaluateM365LiveExecutionReadiness({
    tenantId,
    tenantMode: mode,
    connectorReadiness: "HEALTHY",
    grantedGraphScopes: grantedScopes,
    approvalPolicy: { configured: true },
    verificationConfig: { enabled: true },
    rollbackConfig: { configured: true },
    liveMutationFlag: String(process.env.M365_LIVE_LICENSE_MUTATION_ENABLED ?? "false") === "true",
    latestSyncSummary: { evidenceFreshness: "FRESH", connectorReadiness: "HEALTHY" },
    outcomeLedgerHealth: { writable: true },
    driftMonitorHealth: { active: true },
  });
  return res.json(report);
});

router.post("/m365/reclaim/disabled-users/run", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const tenantMode = process.env.ECON_OPS_TENANT_MODE ?? "PILOT_READ_ONLY";
    const out = await m365DisabledUserReclaimSliceService.run({
      tenantId,
      tenantMode,
      skuPricingCatalog: Array.isArray((req.body as { skuPricingCatalog?: unknown })?.skuPricingCatalog) ? ((req.body as { skuPricingCatalog?: M365SkuPricing[] }).skuPricingCatalog ?? []) : [],
    });
    const drift = await m365DisabledUserReclaimSliceService.detectDrift(tenantId);
    return res.json({ ...out, drift });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "M365_RECLAIM_RUN_FAILED" });
  }
});

router.get("/m365/evidence", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const evidence = await m365ReadOnlySyncService.listLatestEvidence(tenantId);
    return res.json(evidence);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/evaluate-playbooks", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const evidence = await db.select().from(m365EvidenceRecordsTable).where(eq(m365EvidenceRecordsTable.tenantId, tenantId));
    const mapped = evidence.map((e) => ({
      userPrincipalName: e.userId,
      displayName: e.displayName ?? e.userId,
      assignedLicenses: e.assignedLicences as string[],
      cost: Number(e.monthlyLicenceCost),
      days: e.lastSignInAt ? Math.floor((Date.now() - new Date(e.lastSignInAt).getTime()) / 86400000) : 999,
      mailboxType: e.mailboxType,
      accountEnabled: e.accountStatus === "ACTIVE",
      sourceSystem: e.sourceSystem,
      costCentre: e.costCentre,
    }));
    const trust = await trustService.getLatestTrustSnapshot(tenantId, "M365");
    const findings = await reconciliationService.listFindings(tenantId);
    const findingsBlock = findings.some((f: any) => f.status === "OPEN" && (f.severity === "HIGH" || f.severity === "CRITICAL"));
    const result = await playbookService.generateRecommendationsForTenant({
      tenantId,
      source: "M365_SYNC",
      evidenceRecords: mapped,
      actorId: "connector-evaluate",
      trustBand: trust?.trustBand,
      connectorTrustSnapshotId: trust?.id,
      findingsBlock,
    });
    return res.json({
      evaluated: mapped.length,
      recommendations: result.recommendations.length,
      suppressed: result.suppressed.length,
      executionTriggered: false,
      trustBand: trust?.trustBand ?? null,
      connectorTrustSnapshotId: trust?.id ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/m365/trust", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const report = await m365TrustService.generateTrustReport(tenantId);
    const legacySnapshots = await trustService.listTrustSnapshots(tenantId).catch(() => []);
    return res.json({ ...report, legacySnapshots });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/m365/reconciliation-findings", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    return res.json(await reconciliationService.listFindings(tenantId));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/reconciliation-findings/:id/resolve", async (req, res) => {
  try {
    return res.json(await reconciliationService.resolveFinding(Number(req.params.id)));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/m365/reconciliation-findings/:id/suppress", async (req, res) => {
  try {
    return res.json(await reconciliationService.suppressFinding(Number(req.params.id)));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/flexera/readiness", async (_req, res) => {
  try {
    return res.json(await checkFlexeraReadiness());
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/flexera/smoke-test", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const readiness = await checkFlexeraReadiness();
    if (readiness.status !== "READY") return res.status(200).json({ ...readiness, sample: [] });
    const ingestion = await ingestFlexeraTenant(tenantId);
    return res.status(200).json({
      status: "PASS",
      connectorHealth: ingestion.metadata.connectorHealth,
      counts: { entitlements: ingestion.records.length },
      sample: ingestion.records.slice(0, 3).map((r) => ({
        sourceObjectId: r.sourceObjectId,
        userPrincipalName: r.userPrincipalName?.replace(/(^.).+(@.*$)/, "$1***$2") ?? null,
        productName: r.productName,
      })),
      requestIds: [ingestion.metadata.requestId],
      warnings: ingestion.warnings,
      errors: [],
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/flexera/sync", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const ingestion = await ingestFlexeraTenant(tenantId);
    await db.insert(connectorSyncStatusTable).values({
      tenantId,
      connector: "FLEXERA",
      lastSyncTime: new Date(ingestion.metadata.lastSyncTime),
      connectorHealth: ingestion.metadata.connectorHealth,
      dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
      freshnessBand: ingestion.metadata.freshnessBand,
      partialData: String(ingestion.metadata.partialData),
      requestId: ingestion.metadata.requestId,
    });
    for (const r of ingestion.records) {
      await db.insert(flexeraEntitlementsTable).values({ ...r, sourceTimestamp: new Date(r.sourceTimestamp) })
        .onConflictDoUpdate({
          target: [flexeraEntitlementsTable.tenantId, flexeraEntitlementsTable.sourceObjectId],
          set: { ...r, sourceTimestamp: new Date(r.sourceTimestamp), updatedAt: new Date() },
        });
    }
    return res.json({
      tenantId,
      ingestionRunId: ingestion.ingestionRunId,
      connectorHealth: ingestion.metadata.connectorHealth,
      entitlementsSynced: ingestion.records.length,
      warnings: ingestion.warnings,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/servicenow/readiness", async (_req, res) => {
  try {
    return res.json(await checkServiceNowReadiness());
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servicenow/smoke-test", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const readiness = await checkServiceNowReadiness();
    if (readiness.status !== "READY") return res.status(200).json({ ...readiness, sample: { assets: [], contracts: [] } });
    const ingestion = await ingestServiceNowTenant(tenantId);
    return res.status(200).json({
      status: "PASS",
      connectorHealth: ingestion.metadata.connectorHealth,
      counts: { assets: ingestion.assets.length, contracts: ingestion.contracts.length },
      sample: {
        assets: ingestion.assets.slice(0, 2).map((a) => ({
          sourceObjectId: a.sourceObjectId,
          userPrincipalName: a.userPrincipalName?.replace(/(^.).+(@.*$)/, "$1***$2") ?? null,
          status: a.status,
        })),
        contracts: ingestion.contracts.slice(0, 2).map((c) => ({
          sourceObjectId: c.sourceObjectId,
          vendor: c.vendor,
          productName: c.productName,
        })),
      },
      requestIds: [ingestion.metadata.requestId],
      warnings: ingestion.warnings,
      errors: [],
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/servicenow/sync", async (req, res) => {
  try {
    const tenantId = (req.query.tenantId as string) ?? "default";
    const ingestion = await ingestServiceNowTenant(tenantId);
    await db.insert(connectorSyncStatusTable).values({
      tenantId,
      connector: "SERVICENOW",
      lastSyncTime: new Date(ingestion.metadata.lastSyncTime),
      connectorHealth: ingestion.metadata.connectorHealth,
      dataFreshnessScore: ingestion.metadata.dataFreshnessScore,
      freshnessBand: ingestion.metadata.freshnessBand,
      partialData: String(ingestion.metadata.partialData),
      requestId: ingestion.metadata.requestId,
    });
    for (const a of ingestion.assets) {
      await db.insert(servicenowAssetsTable).values({ ...a, sourceTimestamp: new Date(a.sourceTimestamp) })
        .onConflictDoUpdate({
          target: [servicenowAssetsTable.tenantId, servicenowAssetsTable.sourceObjectId],
          set: { ...a, sourceTimestamp: new Date(a.sourceTimestamp), updatedAt: new Date() },
        });
    }
    for (const c of ingestion.contracts) {
      await db.insert(servicenowContractsTable).values({ ...c, sourceTimestamp: new Date(c.sourceTimestamp) })
        .onConflictDoUpdate({
          target: [servicenowContractsTable.tenantId, servicenowContractsTable.sourceObjectId],
          set: { ...c, sourceTimestamp: new Date(c.sourceTimestamp), updatedAt: new Date() },
        });
    }
    return res.json({
      tenantId,
      ingestionRunId: ingestion.ingestionRunId,
      connectorHealth: ingestion.metadata.connectorHealth,
      assetsSynced: ingestion.assets.length,
      contractsSynced: ingestion.contracts.length,
      warnings: ingestion.warnings,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.use("/openai", openaiConnectorRouter);

export default router;
