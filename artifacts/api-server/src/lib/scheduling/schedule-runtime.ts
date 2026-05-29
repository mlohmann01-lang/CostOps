export type ScheduleRuntimeState = 'UPCOMING' | 'READY' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'

export function evaluateScheduleRuntime(input: { executionRequest: any; approvalWorkflow?: any; dryRun?: any; connectorHealth?: string; cancelled?: boolean; completed?: boolean }) {
  if (input.cancelled) return 'CANCELLED' as const
  if (input.completed) return 'COMPLETED' as const
  const blocks: string[] = []
  if (String(input.executionRequest?.readinessState ?? input.executionRequest?.executionState) !== 'READY_FOR_EXECUTION') blocks.push('EXECUTION_REQUEST_NOT_READY')
  if (input.approvalWorkflow && String(input.approvalWorkflow.approvalState) !== 'APPROVED') blocks.push('APPROVAL_NOT_APPROVED')
  if (input.dryRun && String(input.dryRun.simulationState) !== 'READY_FOR_EXECUTION') blocks.push('DRY_RUN_NOT_READY')
  if (String(input.connectorHealth ?? 'READY').toUpperCase() === 'DEGRADED') blocks.push('CONNECTOR_DEGRADED')
  return blocks.length ? 'BLOCKED' as const : 'READY' as const
}

export function buildScheduleRuntimeRows(tenantId: string, requests: any[], dryRuns: any[] = [], connectorHealth = 'READY') {
  return requests.map((request: any) => {
    const requestId = request.requestId ?? request.executionRequestId
    const dryRun = dryRuns.find((row: any) => String(row.executionRequestId) === String(requestId))
    const status = evaluateScheduleRuntime({ executionRequest: request, dryRun, connectorHealth })
    return {
      scheduleId: `schedule-${requestId}`,
      tenantId,
      executionRequestIds: [requestId],
      scheduleName: `Runtime window for ${request.actionType}`,
      scheduleState: status,
      status,
      name: `Runtime window for ${request.actionType}`,
      readiness: status,
      projectedSavings: Number(request.projectedMonthlySavings ?? 0),
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date(Date.now() + 3_600_000).toISOString(),
      rollback: request.rollbackCoverage ?? 'FULL',
      risk: request.riskClass ?? request.actionRiskClass ?? 'B',
      dependencies: status === 'BLOCKED' ? 'Runtime eligibility blocked' : 'Execution request ready',
    }
  })
}
