import type { LedgerEntryInput, SavingConfidence } from "./ledger-entry";

export function createLedgerEntry(input: LedgerEntryInput) {
  const savingConfidence: SavingConfidence =
    input.recommendation?.scoreBreakdown?.savings_confidence === 1 ? "VERIFIED" : "ESTIMATED";

  return {
    tenantId: input.tenantId,
    recommendationId: input.recommendationId,
    idempotencyKey: input.idempotencyKey,
    playbookId: input.recommendation.playbookId ?? "",
    playbookName: input.recommendation.playbookName ?? "",
    action: input.action,
    actionRiskProfile: input.actionRiskProfile,
    trustSnapshot: input.trustSnapshot,
    beforeState: input.beforeState,
    afterState: input.afterState,
    dryRunResult: input.dryRunResult,
    executionEvidence: input.executionEvidence,
    monthlySaving: input.recommendation.monthlyCost,
    annualisedSaving: input.recommendation.annualisedCost,
    pricingSnapshot: input.pricingSnapshot ?? {
      monthlyCost: input.recommendation.monthlyCost,
      annualisedCost: input.recommendation.annualisedCost,
      currency: "USD",
    },
    pricingConfidence: input.pricingConfidence ?? input.recommendation.pricingConfidence ?? "UNKNOWN",
    pricingSource: input.pricingSource ?? input.recommendation.pricingSource ?? "",
    savingConfidence,
    actorId: input.actorId,
    executionMode: input.executionMode,
    executionStatus: input.executionStatus,
  };
}
