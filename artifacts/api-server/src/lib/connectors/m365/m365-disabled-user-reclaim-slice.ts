import { createHash } from "node:crypto";
import { db, recommendationsTable, outcomeLedgerTable, driftEventsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { M365ReadOnlyEvidenceSyncService } from "./m365-readonly-evidence-sync-service";
import { generateM365Recommendations, type M365GeneratedRecommendation, type M365SkuPricing } from "./m365-recommendation-generator";

export class M365DisabledUserReclaimSliceService {
  constructor(private readonly syncService: M365ReadOnlyEvidenceSyncService) {}

  private deterministicCorrelationId(tenantId: string, recommendation: M365GeneratedRecommendation): string {
    return createHash("sha256").update([tenantId, recommendation.playbookId, recommendation.affectedUserId, recommendation.assignedSkuIds.join(",")].join("|")).digest("hex").slice(0, 32);
  }

  async run(input: { tenantId: string; tenantMode: string; skuPricingCatalog?: M365SkuPricing[] }) {
    const sync = await this.syncService.runSync(input.tenantId);
    const generated = generateM365Recommendations({ tenantId: input.tenantId, normalizedEvidence: sync.normalizedEvidence, skuPricingCatalog: input.skuPricingCatalog ?? [] });
    const reclaimOnly = generated.recommendations.filter((r) => r.recommendationType === "LICENSE_RECLAIM");

    const persisted = [] as Array<{ recommendationId: number; executionId: string; ledgerId: number }>;
    for (const rec of reclaimOnly) {
      const correlationId = this.deterministicCorrelationId(input.tenantId, rec);
      const [existing] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.tenantId, input.tenantId), eq(recommendationsTable.correlationId, correlationId))).limit(1);
      if (existing) {
        persisted.push({ recommendationId: existing.id, executionId: `m365-exec-${existing.id}`, ledgerId: 0 });
        continue;
      }
      if (input.tenantMode !== "DEMO" && rec.affectedUserPrincipalName.includes("demo")) continue;
      const [inserted] = await db.insert(recommendationsTable).values({
        tenantId: input.tenantId,
        userEmail: rec.affectedUserPrincipalName,
        displayName: rec.affectedDisplayName,
        licenceSku: rec.assignedSkuNames.join(","),
        monthlyCost: rec.projectedMonthlySavings,
        annualisedCost: rec.projectedAnnualSavings,
        trustScore: rec.trustScore === "HIGH" ? 0.95 : rec.trustScore === "MEDIUM" ? 0.75 : 0.4,
        executionStatus: "APPROVAL_REQUIRED",
        playbook: rec.playbookId,
        playbookId: rec.playbookId,
        playbookName: "M365 Disabled Licensed User Reclaim",
        playbookEvidence: { proofReferences: rec.proofReferences, evidenceFreshness: rec.evidenceFreshness, evidenceConfidence: rec.evidenceConfidence },
        connector: "M365",
        actionType: "REMOVE_LICENSE",
        targetEntityId: rec.affectedUserId,
        targetEntityType: "USER",
        evidenceSummary: { currentState: rec.currentState, recommendedAction: rec.recommendedAction, exclusionReasons: rec.exclusionReasons },
        expectedMonthlySaving: rec.projectedMonthlySavings,
        expectedAnnualSaving: rec.projectedAnnualSavings,
        recommendationExecutionMode: "APPROVAL_REQUIRED",
        recommendationVerificationMethod: rec.verificationStrategy,
        rollbackNotes: rec.rollbackFeasibility,
        recommendationStatus: "CANDIDATE",
        correlationId,
      }).returning({ id: recommendationsTable.id });
      const executionId = `m365-exec-${inserted.id}`;
      const [ledger] = await db.insert(outcomeLedgerTable).values({
        tenantId: input.tenantId,
        recommendationId: inserted.id,
        userEmail: rec.affectedUserPrincipalName,
        displayName: rec.affectedDisplayName,
        action: "REMOVE_LICENSE",
        licenceSku: rec.assignedSkuNames.join(","),
        monthlySaving: rec.projectedMonthlySavings,
        annualisedSaving: rec.projectedAnnualSavings,
        approved: false,
        executed: false,
        executionMode: input.tenantMode === "DEMO" ? "SIMULATED" : "DRY_RUN",
        playbookId: rec.playbookId,
        playbookName: "M365 Disabled Licensed User Reclaim",
        evidence: { proofReferences: rec.proofReferences, verificationState: "PENDING_VERIFICATION", sourceOfTruth: "CONNECTOR" },
        executionStatus: input.tenantMode === "PILOT_READ_ONLY" ? "INTENT_BLOCKED_BY_TENANT_MODE" : "EXECUTION_READY_NOT_LIVE_ENABLED",
        savingConfidence: rec.savingsConfidence,
      }).returning({ id: outcomeLedgerTable.id });
      persisted.push({ recommendationId: inserted.id, executionId, ledgerId: ledger.id });
    }

    return {
      syncSummary: sync.summary,
      generationSummary: generated.summary,
      persistedCount: persisted.length,
      commandCenter: persisted.map((p) => ({ recommendationId: p.recommendationId, executionId: p.executionId, outcomeLedgerId: p.ledgerId, nextOperatorAction: "REQUEST_APPROVAL", state: "APPROVAL_REQUIRED" })),
    };
  }

  async detectDrift(tenantId: string) {
    const recs = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId));
    const events: number[] = [];
    for (const rec of recs.filter((r) => r.playbookId === "m365-disabled-licensed-user-reclaim")) {
      if ((rec.freshnessBand ?? "") !== "0_7") {
        const [ev] = await db.insert(driftEventsTable).values({ tenantId, recommendationId: String(rec.id), outcomeLedgerId: 0, userPrincipalName: rec.userEmail, action: "REMOVE_LICENSE", driftType: "PROOF_STALE", driftStatus: "OPEN", evidence: { freshnessBand: rec.freshnessBand } }).returning({ id: driftEventsTable.id });
        events.push(ev.id);
      }
    }
    return { detected: events.length, eventIds: events };
  }
}
