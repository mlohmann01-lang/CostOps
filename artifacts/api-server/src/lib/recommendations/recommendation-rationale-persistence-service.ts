import { createHash } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, recommendationDecisionTracesTable, recommendationRationalesTable, recommendationsTable } from "@workspace/db";

function canonicalize(input: unknown): string {
  if (Array.isArray(input)) return `[${input.map(canonicalize).join(",")}]`;
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(input);
}

export function deterministicHash(input: unknown): string {
  return createHash("sha256").update(canonicalize(input)).digest("hex");
}

export class RecommendationRationalePersistenceService {
  async persistSnapshot(input: { tenantId: string; recommendation: any; explainability: Record<string, unknown>; evidenceLineage: Record<string, unknown>; decisionTraces: Array<Record<string, unknown>>; connectorTrustSnapshotId?: string; }) {
    const hashPayload = {
      recommendationStatus: input.recommendation.recommendationStatus,
      trustBand: input.explainability["evidenceLineage"],
      explainability: input.explainability,
      evidenceLineage: input.evidenceLineage,
      governanceFactors: input.explainability["trustGovernanceDecisions"] ?? [],
      runtimeFactors: input.recommendation.warnings ?? [],
    };
    const rationaleHash = deterministicHash(hashPayload);
    const [rationale] = await db.insert(recommendationRationalesTable).values({
      tenantId: input.tenantId,
      recommendationId: String(input.recommendation.id),
      connectorType: String(input.recommendation.connector ?? "m365"),
      playbookId: String(input.recommendation.playbookId ?? ""),
      playbookName: String(input.recommendation.playbookName ?? ""),
      recommendationStatus: String(input.recommendation.recommendationStatus ?? "CANDIDATE"),
      trustBand: String((input.explainability.evidenceLineage as any)?.trustBand ?? "MEDIUM"),
      overallTrustScore: Number(input.recommendation.executionReadinessScore ?? 0),
      projectedSavingsMonthly: Number(input.recommendation.expectedMonthlySaving ?? input.recommendation.monthlyCost ?? 0),
      projectedSavingsAnnualized: Number(input.recommendation.expectedAnnualSaving ?? input.recommendation.annualisedCost ?? 0),
      projectedSavingsConfidence: "MEDIUM",
      whyGenerated: { whyExists: input.explainability.whyExists ?? "UNKNOWN" },
      whySafe: { safeStatus: input.explainability.safeStatus ?? "UNKNOWN" },
      whyBlocked: { blockedReason: input.explainability.blockedReason ?? null },
      whyDowngraded: { blockedOrDowngraded: input.explainability.blockedOrDowngraded ?? "NONE" },
      trustFactors: { scoreBreakdown: input.recommendation.scoreBreakdown ?? {} },
      reconciliationFactors: {},
      governanceFactors: { decisions: input.explainability.trustGovernanceDecisions ?? [] },
      runtimeFactors: { warnings: input.recommendation.warnings ?? [], criticalBlockers: input.recommendation.criticalBlockers ?? [] },
      projectedSavingsFactors: input.explainability.projectedSavingsConfidence ?? {},
      evidenceLineage: input.evidenceLineage,
      evidenceRecordIds: Object.keys((input.recommendation.playbookEvidence ?? {} as any)).sort(),
      connectorTrustSnapshotId: input.connectorTrustSnapshotId ?? "",
      explainabilityVersion: String(input.explainability.version ?? "checkpoint-24-v1"),
      deterministicHash: rationaleHash,
      reasoningSchemaVersion: "rationale-schema-v1",
    }).returning();

    for (const trace of input.decisionTraces) {
      const traceHash = deterministicHash({ ...trace, recommendationRationaleId: rationale.id });
      await db.insert(recommendationDecisionTracesTable).values({
        tenantId: input.tenantId,
        recommendationId: String(input.recommendation.id),
        recommendationRationaleId: String(rationale.id),
        stage: String(trace.stage ?? "UNKNOWN"),
        stageOrder: String(trace.stageOrder ?? "0"),
        outcome: String(trace.outcome ?? "UNKNOWN"),
        reason: String(trace.reason ?? ""),
        blocking: String(Boolean(trace.blocking)),
        warning: String(Boolean(trace.warning)),
        sourceEvidenceIds: Array.isArray(trace.sourceEvidenceIds) ? trace.sourceEvidenceIds : [],
        connectorTrustSnapshotId: input.connectorTrustSnapshotId ?? "",
        reconciliationFindingIds: Array.isArray(trace.reconciliationFindingIds) ? trace.reconciliationFindingIds : [],
        decisionEngineVersion: "decision-engine-v1",
        traceHash,
      });
    }

    await db.update(recommendationsTable).set({ latestRationaleId: String(rationale.id) }).where(and(eq(recommendationsTable.id, input.recommendation.id), eq(recommendationsTable.tenantId, input.tenantId)));
    return rationale;
  }

  async getLatestRationale(tenantId: string, recommendationId: number) {
    const [r] = await db.select().from(recommendationRationalesTable).where(and(eq(recommendationRationalesTable.tenantId, tenantId), eq(recommendationRationalesTable.recommendationId, String(recommendationId)))).orderBy(desc(recommendationRationalesTable.generatedAt)).limit(1);
    return r;
  }

  async getRationaleHistory(tenantId: string, recommendationId: number) {
    return db.select().from(recommendationRationalesTable).where(and(eq(recommendationRationalesTable.tenantId, tenantId), eq(recommendationRationalesTable.recommendationId, String(recommendationId)))).orderBy(desc(recommendationRationalesTable.generatedAt));
  }

  async getDecisionTraces(tenantId: string, recommendationId: number) {
    return db.select().from(recommendationDecisionTracesTable).where(and(eq(recommendationDecisionTracesTable.tenantId, tenantId), eq(recommendationDecisionTracesTable.recommendationId, String(recommendationId)))).orderBy(asc(recommendationDecisionTracesTable.stageOrder));
  }

  validateRecommendationReplayIntegrity(rationale: any) {
    const replayHash = deterministicHash({
      recommendationStatus: rationale.recommendationStatus,
      trustBand: rationale.trustBand,
      whyGenerated: rationale.whyGenerated,
      whySafe: rationale.whySafe,
      whyBlocked: rationale.whyBlocked,
      whyDowngraded: rationale.whyDowngraded,
      trustFactors: rationale.trustFactors,
      reconciliationFactors: rationale.reconciliationFactors,
      governanceFactors: rationale.governanceFactors,
      runtimeFactors: rationale.runtimeFactors,
      projectedSavingsFactors: rationale.projectedSavingsFactors,
      evidenceLineage: rationale.evidenceLineage,
    });
    return replayHash === rationale.deterministicHash ? "VALID" : "MISMATCH";
  }
}
