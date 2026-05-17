import { connectorTrustSnapshotsTable, db } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { emitM365Event } from "../../observability/operational-telemetry-service";

export class ConnectorTrustService {
  evaluateM365EvidenceTrust(tenantId: string, evidenceRecords: Record<string, any>[], reconciliationFindings: any[] = []) {
    const avg = (vals: number[]) => vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const dimension = {
      identityTrust: avg(evidenceRecords.map((e) => (e.userId && e.userPrincipalName) ? 95 : 30)),
      licenseTrust: avg(evidenceRecords.map((e) => (e.assignedSkuIds?.length ?? e.assignedLicences?.length ?? 0) > 0 ? 90 : 55)),
      usageTrust: avg(evidenceRecords.map((e) => e.copilotUsage === "UNKNOWN" || e.desktopAppUsage === "UNKNOWN" ? 45 : 85)),
      storageTrust: avg(evidenceRecords.map((e) => e.legalHold === "UNKNOWN" ? 40 : 80)),
      pricingTrust: avg(evidenceRecords.map((e) => Number(e.pricingConfidence ?? 0.5) * 100)),
      governanceTrust: avg(evidenceRecords.map((e) => e.isAdmin === true || e.isPrivileged === true ? 60 : 85)),
      connectorFreshnessTrust: avg(evidenceRecords.map((e) => e.evidenceFreshness === "FRESH" ? 95 : e.evidenceFreshness === "STALE" ? 65 : e.evidenceFreshness === "EXPIRED" ? 30 : 40)),
      reconciliationTrust: Math.max(0, 95 - reconciliationFindings.filter((f) => f.severity === "CRITICAL").length * 30 - reconciliationFindings.filter((f) => f.severity !== "CRITICAL").length * 8),
    };

    const criticalFindings = reconciliationFindings.filter((f) => f.severity === "CRITICAL").map((f) => f.findingType);
    const warningFindings = reconciliationFindings.filter((f) => f.severity !== "CRITICAL").map((f) => f.findingType);
    const trustScore = avg(Object.values(dimension));
    const recommendationTrust = avg([dimension.identityTrust, dimension.licenseTrust, dimension.usageTrust, dimension.reconciliationTrust]);
    const executionReadiness = Math.min(recommendationTrust, dimension.governanceTrust, dimension.connectorFreshnessTrust);
    const trustBand = criticalFindings.length > 0 || trustScore < 50 ? "QUARANTINED" : trustScore >= 85 ? "HIGH" : trustScore >= 70 ? "MEDIUM" : "LOW";

    return { tenantId, connectorType: "M365", connectorId: "M365_GRAPH", sourceSystem: "M365_GRAPH", syncRunId: `sync-${Date.now()}`, trustScore, trustBand,
      freshnessScore: dimension.connectorFreshnessTrust, completenessScore: avg(evidenceRecords.map((e) => Number(e.evidenceCompleteness ?? 0.8) * 100)), consistencyScore: dimension.reconciliationTrust,
      identityMatchScore: dimension.identityTrust, sourceReliabilityScore: 95, criticalFindings, warningFindings,
      dimensionScores: dimension, recommendationTrust, executionReadiness };
  }
  async createTrustSnapshot(input: any) { const [r] = await db.insert(connectorTrustSnapshotsTable).values({ ...input, trustScore: String(input.trustScore), freshnessScore: String(input.freshnessScore), completenessScore: String(input.completenessScore), consistencyScore: String(input.consistencyScore), identityMatchScore: String(input.identityMatchScore), sourceReliabilityScore: String(input.sourceReliabilityScore) }).returning(); if (String(input.trustBand) === "LOW") await emitM365Event("M365_TRUST_DEGRADED", { tenantId: input.tenantId, trustBand: "LOW", sourceComponent: "ConnectorTrustService", decisionStage: "TRUST" }); if (String(input.trustBand) === "QUARANTINED") await emitM365Event("M365_TRUST_QUARANTINED", { tenantId: input.tenantId, trustBand: "QUARANTINED", sourceComponent: "ConnectorTrustService", decisionStage: "TRUST", severity: "HIGH" }); return r; }
  async listTrustSnapshots(tenantId: string) { return db.select().from(connectorTrustSnapshotsTable).where(eq(connectorTrustSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorTrustSnapshotsTable.createdAt)); }
  async getLatestTrustSnapshot(tenantId: string, connectorType = "M365") { const [r] = await db.select().from(connectorTrustSnapshotsTable).where(eq(connectorTrustSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorTrustSnapshotsTable.createdAt)).limit(1); return r && r.connectorType === connectorType ? r : r; }
}
