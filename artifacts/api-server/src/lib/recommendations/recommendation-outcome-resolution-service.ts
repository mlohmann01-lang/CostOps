import { createHash } from "node:crypto";
import { db, outcomeLedgerTable, recommendationOutcomesTable, recommendationsTable } from "@workspace/db";
import { and, desc, eq, gte } from "drizzle-orm";

const WINDOWS: Record<string, number> = { M365_LICENSE_RECLAIM: 7, RIGHTSIZE_ACTION: 14, GROUP_REMOVAL: 3 };

export class RecommendationOutcomeResolutionService {
  async resolveRecommendationOutcome(tenantId: string, recommendationId: string) {
    const [recommendation] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, Number(recommendationId))).limit(1);
    if (!recommendation) return null;
    const projectedMonthlySavings = Number(recommendation.monthlyCost ?? 0);
    const projectedAnnualizedSavings = Number(recommendation.annualisedCost ?? projectedMonthlySavings * 12);
    const windowDays = WINDOWS[recommendation.playbookId ?? ""] ?? 7;
    const verifyAfter = new Date((recommendation.createdAt ?? new Date()).getTime() + windowDays * 86400000);
    const ledgerRows = await db.select().from(outcomeLedgerTable).where(and(eq(outcomeLedgerTable.tenantId, tenantId), eq(outcomeLedgerTable.recommendationId, recommendationId), gte(outcomeLedgerTable.createdAt, recommendation.createdAt!)));
    const now = new Date();
    const hasLedger = ledgerRows.length > 0;
    const realizedMonthlySavings = ledgerRows.reduce((sum, r) => sum + Number(r.monthlySaving ?? 0), 0);
    const driftDetected = ledgerRows.some((r) => String(r.action ?? "").toUpperCase().includes("DRIFT"));
    const reversalDetected = ledgerRows.some((r) => String(r.action ?? "").toUpperCase().includes("ROLLBACK"));

    let outcomeStatus = "UNVERIFIED";
    if (reversalDetected) outcomeStatus = "REVERSED";
    else if (driftDetected) outcomeStatus = "DRIFTED";
    else if (!hasLedger && now >= verifyAfter) outcomeStatus = "FAILED";
    else if (hasLedger && realizedMonthlySavings >= projectedMonthlySavings && now >= verifyAfter) outcomeStatus = "REALIZED";
    else if (hasLedger && realizedMonthlySavings > 0 && now >= verifyAfter) outcomeStatus = "PARTIALLY_REALIZED";
    else if (!hasLedger && now < verifyAfter) outcomeStatus = "PENDING";

    const realizationDelta = realizedMonthlySavings - projectedMonthlySavings;
    const realizationDeltaPercent = projectedMonthlySavings === 0 ? 0 : (realizationDelta / projectedMonthlySavings) * 100;
    const confidenceCalibration = realizationDeltaPercent < -20 ? "CONFIDENCE_OVERSTATED" : realizationDeltaPercent > 20 ? "CONFIDENCE_UNDERSTATED" : "CONFIDENCE_ACCURATE";
    const resolvedPayload = { tenantId, recommendationId, outcomeStatus, projectedMonthlySavings, realizedMonthlySavings, driftDetected, reversalDetected, windowDays, ledgerIds: ledgerRows.map((r)=>r.id) };
    const deterministicHash = createHash("sha256").update(JSON.stringify(resolvedPayload)).digest("hex");

    const [row] = await db.insert(recommendationOutcomesTable).values({
      tenantId,
      recommendationId,
      recommendationRationaleId: recommendation.latestRationaleId ?? "",
      connectorType: recommendation.connector ?? "m365",
      playbookId: recommendation.playbookId ?? "",
      outcomeStatus,
      projectedMonthlySavings,
      projectedAnnualizedSavings,
      realizedMonthlySavings,
      realizedAnnualizedSavings: realizedMonthlySavings * 12,
      realizationDelta,
      realizationDeltaPercent,
      resolutionConfidence: outcomeStatus === "REALIZED" ? "VERIFIED" : hasLedger ? "HIGH" : "LOW",
      confidenceCalibration,
      resolutionEvidence: { verificationWindowDays: windowDays, verifiedAfter: verifyAfter.toISOString() },
      connectorEvidenceSnapshot: recommendation.connectorHealthSnapshot ?? {},
      outcomeLedgerReferences: ledgerRows.map((r) => ({ id: r.id, action: r.action, monthlySaving: r.monthlySaving })),
      postResolutionLineage: { recommendationCreatedAt: recommendation.createdAt?.toISOString() },
      driftDetected,
      reversalDetected,
      driftReason: driftDetected ? "Connector evidence diverged after realization" : null,
      reversalReason: reversalDetected ? "Rollback/reversal evidence observed" : null,
      deterministicHash,
      resolvedAt: new Date(),
    }).returning();
    return row;
  }

  async getOutcomes(tenantId: string, recommendationId: string) {
    return db.select().from(recommendationOutcomesTable).where(and(eq(recommendationOutcomesTable.tenantId, tenantId), eq(recommendationOutcomesTable.recommendationId, recommendationId))).orderBy(desc(recommendationOutcomesTable.resolvedAt));
  }
}
