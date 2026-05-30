import { Router } from "express";
import { db, connectorSyncStatusTable, connectorTrustSnapshotsTable, evidenceReconciliationFindingsTable, governedRecommendationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { rollupExecutionReadiness } from "../lib/trust/execution-readiness-rollup";
import { generateTrustFindings } from "../lib/trust/trust-findings-service";
import { buildConnectorTrustRows, buildTrustSummary } from "../lib/trust/trust-summary-service";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { RecommendationExplainabilityService } from "../lib/recommendations/recommendation-explainability-service";
import { TrustResolutionTaskService } from "../lib/trust/trust-resolution-task-service";
import type { ConnectorRuntimeSignal, TrustFinding, TrustRecommendation } from "../lib/trust/trust-types";

const router = Router();
const recommendationRepo = new GovernedRecommendationRepository();
const explainabilityService = new RecommendationExplainabilityService(recommendationRepo);
const taskService = new TrustResolutionTaskService();

function tenantIdFrom(req: any) {
  return String(req.tenantId ?? req.query.tenantId ?? "default");
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

async function loadGovernedRecommendations(tenantId: string): Promise<TrustRecommendation[]> {
  const rows = await db.select().from(governedRecommendationsTable).where(eq(governedRecommendationsTable.tenantId, tenantId));
  return rows.map((row) => ({
    recommendationId: row.recommendationId,
    tenantId: row.tenantId,
    connector: String(stringArray(row.sourceReferences)[0] ?? row.playbookId?.split("_")[0] ?? "unknown"),
    sourceSystem: String(stringArray(row.sourceReferences)[0] ?? row.playbookId?.split("_")[0] ?? "unknown"),
    executionReadiness: row.executionReadiness,
    recommendationState: row.recommendationState,
    projectedMonthlySavings: row.projectedMonthlySavings,
    projectedAnnualSavings: row.projectedAnnualSavings,
    blockedReasons: stringArray(row.blockedReasons),
    readinessReasons: stringArray(row.readinessReasons),
    evidencePointers: stringArray(row.evidencePointers),
    targetEntityId: row.targetEntityId,
  }));
}

async function loadConnectorSignals(tenantId: string): Promise<ConnectorRuntimeSignal[]> {
  const syncRows = await db.select().from(connectorSyncStatusTable).where(eq(connectorSyncStatusTable.tenantId, tenantId)).orderBy(desc(connectorSyncStatusTable.createdAt));
  const latestByConnector = new Map<string, (typeof syncRows)[number]>();
  for (const row of syncRows) if (!latestByConnector.has(row.connector)) latestByConnector.set(row.connector, row);

  const trustRows = await db.select().from(connectorTrustSnapshotsTable).where(eq(connectorTrustSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorTrustSnapshotsTable.createdAt));
  const latestTrust = new Map<string, (typeof trustRows)[number]>();
  for (const row of trustRows) if (!latestTrust.has(row.connectorType)) latestTrust.set(row.connectorType, row);

  const keys = new Set([...latestByConnector.keys(), ...latestTrust.keys()]);
  return Array.from(keys).map((connector) => {
    const sync = latestByConnector.get(connector);
    const trust = latestTrust.get(connector);
    return {
      connectorId: trust?.connectorId ?? connector.toLowerCase(),
      connectorName: connector,
      platform: connector,
      status: sync?.connectorHealth ?? "UNKNOWN",
      lastSyncAt: sync?.lastSyncTime?.toISOString() ?? trust?.createdAt?.toISOString() ?? null,
      freshnessStatus: sync?.freshnessBand ?? "UNKNOWN",
      dataFreshnessScore: sync?.dataFreshnessScore ?? (trust ? Number(trust.freshnessScore) : null),
      trustScore: trust ? Number(trust.trustScore) : undefined,
      trustReasons: [
        sync ? `Connector health ${sync.connectorHealth}; freshness ${sync.freshnessBand}.` : "Connector sync metadata unavailable.",
        trust ? `Connector trust snapshot ${trust.trustBand}.` : "Connector trust snapshot unavailable.",
      ],
    };
  });
}

async function loadPersistedFindings(tenantId: string): Promise<TrustFinding[]> {
  const rows = await db.select().from(evidenceReconciliationFindingsTable).where(eq(evidenceReconciliationFindingsTable.tenantId, tenantId));
  return rows.map((row) => ({
    findingId: `evidence:${row.id}`,
    tenantId: row.tenantId,
    findingType: row.findingType === "CONNECTOR_HEALTH" ? "CONNECTOR_DEGRADED" : row.findingType === "STALE_EVIDENCE" ? "STALE_SOURCE" : row.findingType === "IDENTITY_MISMATCH" ? "IDENTITY_CONFLICT" : row.findingType === "MISSING_OWNER" ? "MISSING_OWNER" : "MISSING_USAGE_EVIDENCE",
    severity: row.severity === "CRITICAL" ? "CRITICAL" : row.severity === "HIGH" ? "HIGH" : row.severity === "LOW" ? "LOW" : "MEDIUM",
    entityType: row.entityType,
    entityId: row.entityId,
    sourceSystem: row.sourceSystem,
    description: row.description,
    affectedRecommendationIds: stringArray((row.evidenceSnapshot as any)?.affectedRecommendationIds),
    affectedValue: Number((row.evidenceSnapshot as any)?.affectedValue ?? 0),
    status: row.status === "RESOLVED" ? "RESOLVED" : row.status === "SUPPRESSED" ? "SUPPRESSED" : "OPEN",
    remediationHint: row.recommendedResolution,
    detectedAt: row.createdAt.toISOString(),
  }));
}

async function loadTrustContext(tenantId: string) {
  const recommendations = await loadGovernedRecommendations(tenantId);
  const connectors = await loadConnectorSignals(tenantId);
  const generatedFindings = generateTrustFindings({ tenantId, recommendations, connectors });
  const persistedFindings = await loadPersistedFindings(tenantId);
  const findings = [...persistedFindings, ...generatedFindings];
  const connectorRows = buildConnectorTrustRows({ tenantId, recommendations, connectors, findings });
  return { recommendations, connectors: connectorRows, findings };
}

router.get("/accountability", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json(taskService.accountability(tenantId));
});

router.get("/accountability/overdue", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  return res.json({ tenantId, tasks: taskService.overdue(tenantId) });
});

router.get("/tasks", async (req, res) => {
  return res.json({ tasks: taskService.list(tenantIdFrom(req)) });
});

router.get("/tasks/:taskId", async (req, res) => {
  const task = taskService.get(tenantIdFrom(req), String(req.params.taskId));
  if (!task) return res.status(404).json({ error: "TRUST_RESOLUTION_TASK_NOT_FOUND" });
  return res.json(task);
});

router.post("/tasks/:taskId/assign", async (req, res) => {
  const body = req.body ?? {};
  const ownerName = String(body.ownerName ?? body.owner ?? "").trim();
  if (!ownerName) return res.status(400).json({ error: "TRUST_TASK_OWNER_REQUIRED" });
  const ownerType = ["USER", "TEAM", "SYSTEM"].includes(String(body.ownerType ?? "")) ? String(body.ownerType) as any : "TEAM";
  const result = taskService.assign({ tenantId: tenantIdFrom(req), taskId: String(req.params.taskId), ownerId: body.ownerId ? String(body.ownerId) : undefined, ownerName, ownerType });
  if (!result) return res.status(404).json({ error: "TRUST_RESOLUTION_TASK_NOT_FOUND" });
  if ("error" in result) return res.status(409).json({ error: result.error });
  return res.json(result);
});

router.post("/tasks/:taskId/escalate", async (req, res) => {
  const body = req.body ?? {};
  const requested = body.escalationLevel ? String(body.escalationLevel) : undefined;
  if (requested && !["MANAGER", "DIRECTOR", "EXECUTIVE"].includes(requested)) return res.status(400).json({ error: "INVALID_ESCALATION_LEVEL" });
  const result = taskService.escalate({ tenantId: tenantIdFrom(req), taskId: String(req.params.taskId), escalationLevel: requested as any, reason: body.reason ? String(body.reason) : undefined });
  if (!result) return res.status(404).json({ error: "TRUST_RESOLUTION_TASK_NOT_FOUND" });
  if ("error" in result) return res.status(409).json({ error: result.error });
  return res.json(result);
});

router.post("/tasks/:taskId/status", async (req, res) => {
  const status = String((req.body ?? {}).status ?? "");
  if (!["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"].includes(status)) return res.status(400).json({ error: "INVALID_TASK_STATUS" });
  const result = taskService.setStatus({ tenantId: tenantIdFrom(req), taskId: String(req.params.taskId), status: status as any });
  if (!result) return res.status(404).json({ error: "TRUST_RESOLUTION_TASK_NOT_FOUND" });
  return res.json(result);
});

router.post("/findings/:findingId/tasks", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const findingId = decodeURIComponent(String(req.params.findingId));
  const ctx = await loadTrustContext(tenantId);
  const finding = ctx.findings.find((item) => item.findingId === findingId);
  if (!finding) return res.status(404).json({ error: "TRUST_FINDING_NOT_FOUND" });
  const body = req.body ?? {};
  const result = taskService.createFromFinding({ tenantId, finding, owner: body.owner ? String(body.owner) : undefined, ownerId: body.ownerId ? String(body.ownerId) : undefined, ownerName: body.ownerName ? String(body.ownerName) : undefined, ownerType: body.ownerType, title: body.title, description: body.description });
  return res.status(result.duplicate ? 200 : 201).json(result);
});

router.get("/summary", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const ctx = await loadTrustContext(tenantId);
  return res.json(buildTrustSummary({ tenantId, recommendations: ctx.recommendations, connectors: ctx.connectors, findings: ctx.findings }));
});

router.get("/connectors", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const ctx = await loadTrustContext(tenantId);
  return res.json(ctx.connectors);
});


router.get("/findings/:findingId/affected-recommendations", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const findingId = decodeURIComponent(String(req.params.findingId));
  const ctx = await loadTrustContext(tenantId);
  const finding = ctx.findings.find((item) => item.findingId === findingId);
  if (!finding) return res.status(404).json({ error: "TRUST_FINDING_NOT_FOUND" });
  const affected = await Promise.all(finding.affectedRecommendationIds.map((id) => explainabilityService.explain(tenantId, id)));
  return res.json({ finding, affectedRecommendations: affected.filter(Boolean).slice(0, 50), blockedValue: finding.affectedValue });
});

router.get("/findings", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const ctx = await loadTrustContext(tenantId);
  return res.json(ctx.findings.filter((finding) => finding.tenantId === tenantId));
});

router.get("/readiness", async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const recommendations = await loadGovernedRecommendations(tenantId);
  return res.json(rollupExecutionReadiness(recommendations));
});

export default router;
