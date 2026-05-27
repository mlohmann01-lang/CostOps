import { runPreflight } from "./preflight-engine";
import { simulateM365RemoveLicense } from "./simulators/m365-remove-license-simulator";
import { simulateM365CopilotReclaim } from "./simulators/m365-copilot-reclaim-simulator";

export type DryRunState = "READY_FOR_EXECUTION" | "BLOCKED" | "REQUIRES_REVIEW" | "INVALID";

export function simulateExecutionRequest(input: {
  simulationId: string;
  executionRequestId: string;
  actionType: string;
  executionState: string;
  expiresAt: Date;
  recommendationState: string;
  lifecycleState: string;
  evidencePointers: string[];
  approvalEventIds: string[];
  projectedMonthlySavings: number;
  targetEntityId: string;
  policyBlocks?: string[];
}) {
  const preflightResults = runPreflight({
    executionState: input.executionState,
    expiresAt: input.expiresAt,
    recommendationState: input.recommendationState,
    lifecycleState: input.lifecycleState,
    evidencePointers: input.evidencePointers,
    approvalEventIds: input.approvalEventIds,
    exclusionBlocked: (input.policyBlocks ?? []).length > 0,
    conflictingEvent: false,
  });

  const validationErrors = preflightResults.filter((c) => !c.ok).map((c) => `${c.check}:${c.message}`);
  const validationWarnings: string[] = [];
  const has = (p: string) => input.evidencePointers.some((x) => x.startsWith(p));
  if (input.actionType === "RECLAIM_COPILOT_LICENSE") {
    if (!has('m365:copilot-sku:')) validationErrors.push('COPILOT_SKU_EVIDENCE_MISSING');
    if (!has('m365:copilot-usage:')) validationErrors.push('COPILOT_USAGE_EVIDENCE_MISSING');
    if (has('exclusion:vip') || has('exclusion:compliance') || has('exclusion:pilot') || has('exclusion:exception')) validationErrors.push('COPILOT_EXCLUSION_BLOCKED');
  }

  let simulatedActions: unknown[] = [];
  let impactedEntities: unknown[] = [];
  let projectedSavingsValidated = 0;
  let rollbackPlan: Record<string, unknown> = {};
  let rollbackSupported = false;

  if (input.actionType === "REMOVE_LICENSE") {
    const sim = simulateM365RemoveLicense({ executionRequestId: input.executionRequestId, targetEntityId: input.targetEntityId, evidencePointers: input.evidencePointers, projectedMonthlySavings: input.projectedMonthlySavings });
    simulatedActions = sim.simulatedActions;
    impactedEntities = sim.impactedEntities;
    projectedSavingsValidated = sim.projectedSavingsValidated;
    rollbackPlan = sim.rollbackPlan;
    rollbackSupported = sim.rollbackSupported;
  } else if (input.actionType === "RECLAIM_COPILOT_LICENSE") {
    const sim = simulateM365CopilotReclaim({ executionRequestId: input.executionRequestId, targetEntityId: input.targetEntityId, evidencePointers: input.evidencePointers, projectedMonthlySavings: input.projectedMonthlySavings });
    simulatedActions = sim.simulatedActions;
    impactedEntities = sim.impactedEntities;
    projectedSavingsValidated = sim.projectedSavingsValidated;
    rollbackPlan = sim.rollbackPlan;
    rollbackSupported = sim.rollbackSupported;
  } else {
    validationWarnings.push("UNSUPPORTED_ACTION_SIMULATED_AS_REVIEW");
  }

  let simulationState: DryRunState = "READY_FOR_EXECUTION";
  if (validationErrors.length) simulationState = "BLOCKED";
  if (validationWarnings.length && !validationErrors.length) simulationState = "REQUIRES_REVIEW";
  if (!input.executionRequestId) simulationState = "INVALID";

  return {
    simulationId: input.simulationId,
    executionRequestId: input.executionRequestId,
    simulationState,
    simulatedActions,
    impactedEntities,
    projectedSavingsValidated,
    validationWarnings,
    validationErrors,
    rollbackPlan,
    rollbackSupported,
    policyBlocks: input.policyBlocks ?? [],
    preflightResults,
    simulatedAt: new Date().toISOString(),
  };
}
