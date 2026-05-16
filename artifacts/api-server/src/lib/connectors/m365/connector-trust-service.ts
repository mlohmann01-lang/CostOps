import { connectorTrustSnapshotsTable, db } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

export class ConnectorTrustService {
  evaluateM365EvidenceTrust(tenantId: string, evidenceRecords: Record<string, any>[], reconciliationFindings: any[] = []) {
    const avg = (vals: number[]) => vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const freshnessScore = avg(evidenceRecords.map((e) => Number(e.evidenceFreshness ?? 0.8) * 100));
    const completenessScore = avg(evidenceRecords.map((e) => Number(e.evidenceCompleteness ?? 0.8) * 100));
    const consistencyScore = Math.max(0, 100 - reconciliationFindings.filter((f) => f.severity === "WARNING").length * 5);
    const identityMatchScore = avg(evidenceRecords.map((e) => (e.userId || e.userPrincipalName) ? 95 : 20));
    const sourceReliabilityScore = 95;
    const criticalFindings = reconciliationFindings.filter((f) => f.severity === "CRITICAL").map((f) => f.findingType);
    const warningFindings = reconciliationFindings.filter((f) => f.severity !== "CRITICAL").map((f) => f.findingType);
    const trustScore = (freshnessScore + completenessScore + consistencyScore + identityMatchScore + sourceReliabilityScore) / 5;
    const trustBand = criticalFindings.length > 0 || trustScore < 50 ? "QUARANTINED" : trustScore >= 90 ? "HIGH" : trustScore >= 75 ? "MEDIUM" : "LOW";
    return { tenantId, connectorType: "M365", connectorId: "M365_GRAPH", sourceSystem: "M365_GRAPH", syncRunId: `sync-${Date.now()}`, trustScore, trustBand, freshnessScore, completenessScore, consistencyScore, identityMatchScore, sourceReliabilityScore, criticalFindings, warningFindings };
  }
  async createTrustSnapshot(input: any) { const [r] = await db.insert(connectorTrustSnapshotsTable).values({ ...input, trustScore: String(input.trustScore), freshnessScore: String(input.freshnessScore), completenessScore: String(input.completenessScore), consistencyScore: String(input.consistencyScore), identityMatchScore: String(input.identityMatchScore), sourceReliabilityScore: String(input.sourceReliabilityScore) }).returning(); return r; }
  async listTrustSnapshots(tenantId: string) { return db.select().from(connectorTrustSnapshotsTable).where(eq(connectorTrustSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorTrustSnapshotsTable.createdAt)); }
  async getLatestTrustSnapshot(tenantId: string, connectorType = "M365") { const [r] = await db.select().from(connectorTrustSnapshotsTable).where(eq(connectorTrustSnapshotsTable.tenantId, tenantId)).orderBy(desc(connectorTrustSnapshotsTable.createdAt)).limit(1); return r && r.connectorType === connectorType ? r : r; }
}
