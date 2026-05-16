import { Router } from "express";
import { db, policySimulationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { PolicySimulationService, type SimulationScope } from "../lib/simulations/policy-simulation-service";

const router = Router();
const service = new PolicySimulationService();

router.post("/", async (req, res) => {
  const tenantId = String((req.headers["x-tenant-id"] as string) || "default");
  const simulationScope = String(req.body?.simulationScope || "RECOMMENDATION") as SimulationScope;
  const scopeEntityIds = Array.isArray(req.body?.scopeEntityIds) ? req.body.scopeEntityIds.map(String) : [];
  const simulationName = String(req.body?.simulationName || "Policy Simulation");

  const out = service.simulate({
    tenantId, simulationName, simulationScope, scopeEntityIds, connectorType: "m365",
    projectedMonthlySavings: Number(req.body?.projectedMonthlySavings ?? 18400),
    projectedAffectedUsers: Number(req.body?.projectedAffectedUsers ?? 182),
    projectedAffectedGroups: Number(req.body?.projectedAffectedGroups ?? 14),
    projectedAffectedLicenses: Number(req.body?.projectedAffectedLicenses ?? 182),
    privilegedEntities: Number(req.body?.privilegedEntities ?? 4),
    unresolvedBlockers: Number(req.body?.unresolvedBlockers ?? 1),
    lowOrQuarantinedTrustEntities: Number(req.body?.lowOrQuarantinedTrustEntities ?? 3),
    staleEvidenceEntities: Number(req.body?.staleEvidenceEntities ?? 6),
    actionType: String(req.body?.actionType ?? "REMOVE_LICENSE"),
    entitlementType: String(req.body?.entitlementType ?? "M365_E3"),
    connectorReliabilityScore: Number(req.body?.connectorReliabilityScore ?? 88),
    policyExceptionCount: Number(req.body?.policyExceptionCount ?? 1),
    governanceSensitivityScore: Number(req.body?.governanceSensitivityScore ?? 44),
    forecastInput: {
      historicalRealizationRate: Number(req.body?.forecastInput?.historicalRealizationRate ?? 0.96),
      historicalDriftRate: Number(req.body?.forecastInput?.historicalDriftRate ?? 0.08),
      historicalReversalRate: Number(req.body?.forecastInput?.historicalReversalRate ?? 0.04),
      projectedVsRealizedDeltaPercent: Number(req.body?.forecastInput?.projectedVsRealizedDeltaPercent ?? 14),
      confidenceCalibratedRate: Number(req.body?.forecastInput?.confidenceCalibratedRate ?? 0.81),
    },
  });

  const [saved] = await db.insert(policySimulationsTable).values({
    tenantId: out.tenantId, simulationName: out.simulationName, connectorType: out.connectorType,
    simulationScope: out.simulationScope, scopeEntityIds: out.scopeEntityIds, simulationStatus: out.simulationStatus,
    projectedMonthlySavings: String(out.projectedMonthlySavings), projectedAnnualizedSavings: String(out.projectedAnnualizedSavings),
    projectedAffectedUsers: String(out.projectedAffectedUsers), projectedAffectedGroups: String(out.projectedAffectedGroups), projectedAffectedLicenses: String(out.projectedAffectedLicenses),
    blastRadiusScore: String(out.blastRadiusScore), reversibilityRiskScore: String(out.reversibilityRiskScore), governanceRiskScore: String(out.governanceRiskScore), trustRiskScore: String(out.trustRiskScore),
    predictedRealizationConfidence: out.predictedRealizationConfidence, predictedDriftRisk: String(out.predictedDriftRisk), predictedReversalRisk: String(out.predictedReversalRisk),
    simulationReasoning: out.simulationReasoning, governanceReasoning: out.governanceReasoning, trustReasoning: out.trustReasoning, blastRadiusReasoning: out.blastRadiusReasoning,
    deterministicHash: out.deterministicHash, simulationEngineVersion: out.simulationEngineVersion, createdAt: out.createdAt,
  }).returning();
  return res.status(201).json(saved);
});

router.get("/", async (req, res) => {
  const tenantId = String((req.headers["x-tenant-id"] as string) || "default");
  const rows = await db.select().from(policySimulationsTable).where(eq(policySimulationsTable.tenantId, tenantId)).orderBy(desc(policySimulationsTable.createdAt));
  return res.json(rows);
});

router.get("/:id", async (req, res) => { const rows = await db.select().from(policySimulationsTable).where(eq(policySimulationsTable.id, Number(req.params.id))).limit(1); if (!rows[0]) return res.status(404).json({ error: "Not found" }); return res.json(rows[0]); });
router.get("/:id/explainability", async (req, res) => { const rows = await db.select().from(policySimulationsTable).where(eq(policySimulationsTable.id, Number(req.params.id))).limit(1); if (!rows[0]) return res.status(404).json({ error: "Not found" }); const r:any=rows[0]; return res.json({ simulationReasoning: r.simulationReasoning, governanceReasoning: r.governanceReasoning, trustReasoning: r.trustReasoning, blastRadiusReasoning: r.blastRadiusReasoning }); });
router.get("/:id/integrity", async (req, res) => { const rows = await db.select().from(policySimulationsTable).where(eq(policySimulationsTable.id, Number(req.params.id))).limit(1); if (!rows[0]) return res.status(404).json({ error: "Not found" }); const r:any=rows[0]; const integrityValid = service.validateIntegrity({ ...r, createdAt: new Date(r.createdAt), deterministicHash: r.deterministicHash }); return res.json({ deterministicHash: r.deterministicHash, simulationEngineVersion: r.simulationEngineVersion, integrityValid }); });

export default router;
