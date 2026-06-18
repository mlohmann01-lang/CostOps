import { connectorTrustSnapshotsTable, db } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { evaluateConnectorHealth, type ConnectorHealthInput } from "../connector-health-model";
import type { FlexeraDiscoveryResult } from "../../production-connectors/flexera/flexera-types";

export const FLEXERA_CONNECTOR_TYPE = "FLEXERA";

export class FlexeraConnectorTrustService {
  evaluateFlexeraReadPathTrust(tenantId: string, discovery: FlexeraDiscoveryResult, healthInput: Omit<ConnectorHealthInput, "tenantId" | "connectorId" | "provider"> = {}) {
    const health = evaluateConnectorHealth({ tenantId, connectorId: FLEXERA_CONNECTOR_TYPE, provider: "FLEXERA", ...healthInput });
    const connectorHealthTrust = health.trustScore * 100;

    const applicationCount = discovery.applications.length;
    const ownedCount = discovery.applications.filter((app) => Boolean(app.owner)).length;
    const mappingConfidence = applicationCount > 0 ? (ownedCount / applicationCount) * 100 : 100;

    const expectedCategories = ["applications", "entitlements", "contracts", "consumption"] as const;
    const presentCategories = expectedCategories.filter((key) => (discovery[key]?.length ?? 0) > 0).length;
    const completenessScore = (presentCategories / expectedCategories.length) * 100;

    const freshnessScore = connectorHealthTrust;
    const consistencyScore = discovery.evidenceRefs.length > 0 ? 90 : 30;
    const sourceReliabilityScore = connectorHealthTrust;

    const dimension = { connectorHealthTrust, mappingConfidence, completenessScore, freshnessScore };
    const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    const trustScore = avg(Object.values(dimension));

    const criticalFindings: string[] = [];
    const warningFindings: string[] = [];
    if (health.healthState === "AUTH_FAILED" || health.healthState === "UNAVAILABLE") criticalFindings.push("CONNECTOR_DEGRADED");
    if (mappingConfidence < 100) warningFindings.push("MISSING_OWNER");
    if (consistencyScore < 50) warningFindings.push("MISSING_USAGE_EVIDENCE");
    if (health.healthState === "STALE" || health.healthState === "DEGRADED") warningFindings.push("STALE_SOURCE");

    const trustBand = criticalFindings.length > 0 || trustScore < 50 ? "QUARANTINED" : trustScore >= 85 ? "HIGH" : trustScore >= 70 ? "MEDIUM" : "LOW";

    return {
      tenantId,
      connectorType: FLEXERA_CONNECTOR_TYPE,
      connectorId: FLEXERA_CONNECTOR_TYPE,
      sourceSystem: FLEXERA_CONNECTOR_TYPE,
      syncRunId: discovery.runId,
      trustScore,
      trustBand,
      freshnessScore,
      completenessScore,
      consistencyScore,
      identityMatchScore: mappingConfidence,
      sourceReliabilityScore,
      criticalFindings,
      warningFindings,
      dimensionScores: dimension,
    };
  }

  async createTrustSnapshot(input: ReturnType<FlexeraConnectorTrustService["evaluateFlexeraReadPathTrust"]>) {
    const [row] = await db
      .insert(connectorTrustSnapshotsTable)
      .values({
        tenantId: input.tenantId,
        connectorType: input.connectorType,
        connectorId: input.connectorId,
        sourceSystem: input.sourceSystem,
        syncRunId: input.syncRunId,
        trustScore: String(input.trustScore),
        trustBand: input.trustBand,
        freshnessScore: String(input.freshnessScore),
        completenessScore: String(input.completenessScore),
        consistencyScore: String(input.consistencyScore),
        identityMatchScore: String(input.identityMatchScore),
        sourceReliabilityScore: String(input.sourceReliabilityScore),
        criticalFindings: input.criticalFindings,
        warningFindings: input.warningFindings,
      })
      .returning();
    return row;
  }

  async getLatestTrustSnapshot(tenantId: string) {
    const [row] = await db
      .select()
      .from(connectorTrustSnapshotsTable)
      .where(eq(connectorTrustSnapshotsTable.tenantId, tenantId))
      .orderBy(desc(connectorTrustSnapshotsTable.createdAt))
      .limit(1);
    return row;
  }
}
