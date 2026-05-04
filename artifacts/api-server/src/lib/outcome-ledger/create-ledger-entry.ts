import type { LedgerEntryInput, SavingConfidence } from "./ledger-entry";

export function createLedgerEntry(input: LedgerEntryInput) {
  const savingConfidence: SavingConfidence =
    input.recommendation?.scoreBreakdown?.savings_confidence === 1 ? "VERIFIED" : "ESTIMATED";

  return {
    tenantId: input.tenantId,
    recommendationId: input.recommendation.id,
    playbookId: input.recommendation.playbookId ?? "",
    playbookName: input.recommendation.playbookName ?? "",
    action: "REMOVE_LICENSE",
    actionRiskProfile: input.actionRiskProfile,
    trustSnapshot: input.trustSnapshot,
    beforeState: input.beforeState,
    afterState: input.afterState,
    dryRunResult: input.dryRunResult,
    executionEvidence: input.executionEvidence,
    monthlySaving: input.recommendation.monthlyCost,
    annualisedSaving: input.recommendation.annualisedCost,
    savingConfidence,
    actorId: input.actorId,
    executionMode: input.executionMode,
    executionStatus: input.executionStatus,
  };
}
