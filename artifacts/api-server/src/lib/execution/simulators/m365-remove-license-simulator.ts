import { planRollbackForRemoveLicense } from "../rollback-planner";

export function simulateM365RemoveLicense(input: {
  executionRequestId: string;
  targetEntityId: string;
  evidencePointers: string[];
  projectedMonthlySavings: number;
}) {
  const rollbackPlan = planRollbackForRemoveLicense(input.targetEntityId, input.evidencePointers);
  return {
    simulatedActions: [{ action: "REMOVE_LICENSE", mode: "SIMULATED", targetEntityId: input.targetEntityId }],
    impactedEntities: [{ entityId: input.targetEntityId, entityType: "User" }],
    projectedSavingsValidated: input.projectedMonthlySavings,
    rollbackPlan,
    rollbackSupported: true,
  };
}
