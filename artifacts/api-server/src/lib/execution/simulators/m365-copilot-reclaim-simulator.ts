export function simulateM365CopilotReclaim(input: {
  executionRequestId: string;
  targetEntityId: string;
  evidencePointers: string[];
  projectedMonthlySavings: number;
}) {
  const copilotSku = input.evidencePointers.find((e) => e.startsWith('m365:copilot-sku:'))?.replace('m365:copilot-sku:', '');
  const assignmentSnapshot = input.evidencePointers.find((e) => e.startsWith('m365:copilot-assignment-snapshot:'))?.replace('m365:copilot-assignment-snapshot:', '');
  return {
    simulatedActions: [{ action: 'RECLAIM_COPILOT_LICENSE', mode: 'SIMULATED', operation: 'REMOVE_COPILOT_SKU', sku: copilotSku ?? 'UNKNOWN', targetEntityId: input.targetEntityId }],
    impactedEntities: [{ entityId: input.targetEntityId, entityType: 'User', sku: copilotSku ?? 'UNKNOWN' }],
    projectedSavingsValidated: Number(input.projectedMonthlySavings ?? 0),
    rollbackPlan: {
      type: 'RESTORE_COPILOT_LICENSE',
      action: 'restore-copilot-licence',
      targetEntityId: input.targetEntityId,
      assignedCopilotSkuSnapshot: assignmentSnapshot ?? copilotSku ?? null,
      evidenceRequired: ['m365:copilot-assignment-snapshot'],
    },
    rollbackSupported: Boolean(assignmentSnapshot || copilotSku),
  };
}
