import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, recommendationArbitrationSnapshotsTable, recommendationsTable, operationalEntitiesTable } from "@workspace/db";

export type PriorityBand = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SUPPRESSED";

const clamp = (v: number) => Math.max(0, Math.min(100, v));
const stableHash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

const CONFLICTS = new Map<string, string[]>([
  ["REMOVE_LICENSE", ["RIGHTSIZE_LICENSE", "KEEP_EXCEPTION", "DOWNGRADE_LICENSE"]],
  ["RIGHTSIZE_LICENSE", ["REMOVE_LICENSE"]],
  ["DOWNGRADE_E5_TO_E3", ["REMOVE_E5"]],
  ["RECLAIM_USER_LICENSE", ["KEEP_EXCEPTION"]],
]);

export class RecommendationArbitrationService {
  async arbitrate(tenantId: string) {
    const recommendations = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId)).orderBy(desc(recommendationsTable.createdAt));
    const rows = [];
    for (const r of recommendations) {
      const [entity] = await db.select().from(operationalEntitiesTable).where(and(eq(operationalEntitiesTable.tenantId, tenantId), eq(operationalEntitiesTable.canonicalKey, String(r.userEmail || r.targetEntityId || "").toLowerCase()))).limit(1);
      rows.push(this.scoreRow(tenantId, r, entity));
    }

    const dedupeWinners = new Map<string, any>();
    for (const row of rows) {
      const key = `${tenantId}:${row.entityId}:${row.playbookId}:${row.actionType}`;
      const current = dedupeWinners.get(key);
      row.deduplicationGroupId = stableHash(key);
      if (!current || row.realizationConfidenceScore > current.realizationConfidenceScore || row.createdAtSource > current.createdAtSource) dedupeWinners.set(key, row);
    }

    for (const row of rows) {
      const key = `${tenantId}:${row.entityId}:${row.playbookId}:${row.actionType}`;
      if (dedupeWinners.get(key) !== row) row.suppressionReasons.push("SUPPRESSED_DUPLICATE_RECOMMENDATION");
    }

    const conflictGroups = new Map<string, any[]>();
    for (const row of rows) {
      const conflictType = this.conflictType(row.actionType);
      if (!conflictType) continue;
      const ckey = `${tenantId}:${row.entityId}:${conflictType}`;
      row.conflictGroupId = stableHash(ckey);
      conflictGroups.set(ckey, [...(conflictGroups.get(ckey) ?? []), row]);
    }
    for (const [, group] of conflictGroups) {
      group.sort((a, b) => b.priorityScore - a.priorityScore || b.realizationConfidenceScore - a.realizationConfidenceScore || String(a.recommendationId).localeCompare(String(b.recommendationId)));
      for (const loser of group.slice(1)) loser.suppressionReasons.push("SUPPRESSED_BY_HIGHER_PRIORITY_CONFLICT");
    }

    const persisted = [];
    for (const row of rows) {
      if (row.suppressionReasons.length > 0 || row.priorityScore < 25) row.priorityBand = "SUPPRESSED";
      const hashInput = { tenantId, recommendationId: row.recommendationId, priorityScore: row.priorityScore, suppressionReasons: row.suppressionReasons, conflictGroupId: row.conflictGroupId, deduplicationGroupId: row.deduplicationGroupId };
      const [saved] = await db.insert(recommendationArbitrationSnapshotsTable).values({ tenantId: row.tenantId,recommendationId: String(row.recommendationId),playbookId: row.playbookId,connectorType: row.connectorType,priorityScore: row.priorityScore,priorityBand: row.priorityBand,projectedSavingsScore: row.projectedSavingsScore,trustScore: row.trustScore,governanceRiskScore: row.governanceRiskScore,blastRadiusScore: row.blastRadiusScore,reversibilityScore: row.reversibilityScore,realizationConfidenceScore: row.realizationConfidenceScore,driftRiskScore: row.driftRiskScore,reversalRiskScore: row.reversalRiskScore,urgencyScore: row.urgencyScore,arbitrationReasons: row.arbitrationReasons,suppressionReasons: row.suppressionReasons,conflictGroupId: row.conflictGroupId,deduplicationGroupId: row.deduplicationGroupId,arbitrationEngineVersion: row.arbitrationEngineVersion,deterministicHash: stableHash(hashInput) }).returning();
      persisted.push(saved);
    }
    persisted.sort((a, b) => b.priorityScore - a.priorityScore || b.createdAt.getTime() - a.createdAt.getTime());
    return persisted;
  }

  private conflictType(actionType: string) {
    const at = actionType || "REMOVE_LICENSE";
    if (CONFLICTS.has(at)) return at;
    for (const [k, vals] of CONFLICTS) if (vals.includes(at)) return k;
    return null;
  }

  private scoreRow(tenantId: string, rec: any, graphEntity?: any) {
    const projectedSavingsScore = clamp(((rec.expectedMonthlySaving ?? rec.monthlyCost ?? 0) / 500) * 100);
    const trustScore = clamp((rec.trustScore ?? 0) * 100);
    const governanceRiskScore = clamp((rec.executionStatus === "BLOCKED" ? 90 : rec.executionStatus === "APPROVAL_REQUIRED" ? 40 : 10) + (graphEntity?.metadata?.privileged ? 20 : 0));
    const blastRadiusScore = clamp(rec.recommendationRiskClass === "A" ? 90 : rec.recommendationRiskClass === "B" ? 40 : 20);
    const reversibilityScore = clamp(rec.actionType?.includes("REMOVE") ? 60 : 80);
    const realizationConfidenceScore = clamp((rec.pricingConfidence?.startsWith("VERIFIED") ? 0.9 : 0.6) * 100 - (graphEntity?.isOrphaned ? 20 : 0));
    const driftRiskScore = clamp((rec.daysSinceActivity ?? 0) > 180 ? 30 : 10);
    const reversalRiskScore = clamp(rec.criticalBlockers?.length ? 50 : 10);
    const urgencyScore = clamp((rec.daysSinceActivity ?? 0) > 120 ? 85 : 55);
    let priorityScore = clamp(projectedSavingsScore * 0.25 + realizationConfidenceScore * 0.2 + trustScore * 0.15 + urgencyScore * 0.15 + reversibilityScore * 0.1 - governanceRiskScore * 0.1 - blastRadiusScore * 0.03 - driftRiskScore * 0.01 - reversalRiskScore * 0.01);

    const suppressionReasons: string[] = [];
    if (String(rec.status).toLowerCase() === "suppressed") suppressionReasons.push("SUPPRESSED_BY_RECOMMENDATION_STATUS");
    if (String(rec.recommendationStatus).toUpperCase() === "SUPPRESSED") suppressionReasons.push("SUPPRESSED_BY_RECOMMENDATION_STATUS");
    if (String(rec.executionStatus).toUpperCase() === "BLOCKED") suppressionReasons.push("SUPPRESSED_BY_GOVERNANCE_BLOCK");
    if ((rec.criticalBlockers ?? []).some((b: string) => String(b).toUpperCase().includes("CRITICAL"))) suppressionReasons.push("SUPPRESSED_BY_RECONCILIATION_BLOCKER");
    if (String(rec.connectorHealth).toUpperCase() === "QUARANTINED") suppressionReasons.push("SUPPRESSED_BY_QUARANTINED_CONNECTOR_TRUST");
    if ((rec.expectedMonthlySaving ?? rec.monthlyCost ?? 0) <= 0) suppressionReasons.push("SUPPRESSED_BY_NO_ECONOMIC_VALUE");

    let priorityBand: PriorityBand = priorityScore >= 85 ? "CRITICAL" : priorityScore >= 70 ? "HIGH" : priorityScore >= 50 ? "MEDIUM" : priorityScore >= 25 ? "LOW" : "SUPPRESSED";

    return {
      tenantId,
      recommendationId: rec.id,
      playbookId: rec.playbookId ?? "",
      connectorType: rec.connector ?? "m365",
      priorityScore,
      priorityBand,
      projectedSavingsScore,
      trustScore,
      governanceRiskScore,
      blastRadiusScore,
      reversibilityScore,
      realizationConfidenceScore,
      driftRiskScore,
      reversalRiskScore,
      urgencyScore,
      arbitrationReasons: ["DETERMINISTIC_WEIGHTED_SCORING", graphEntity ? "GRAPH_CONTEXT_APPLIED" : "GRAPH_CONTEXT_UNAVAILABLE"],
      suppressionReasons,
      conflictGroupId: null,
      deduplicationGroupId: null,
      arbitrationEngineVersion: "recommendation-arbitration-v1",
      createdAt: new Date(),
      entityId: rec.targetEntityId || rec.userEmail || String(rec.id),
      actionType: rec.actionType || "REMOVE_LICENSE",
      createdAtSource: rec.createdAt as Date,
    } as any;
  }
}
