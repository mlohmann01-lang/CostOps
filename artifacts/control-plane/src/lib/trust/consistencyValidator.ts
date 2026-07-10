export type ConsistencyWarning =
  | 'READINESS_CONTRADICTION'
  | 'RETENTION_CONTRADICTION'
  | 'CONNECTOR_CONTRADICTION'

export interface ConsistencyCheckInput {
  readiness?: number
  requiredActionsCount?: number
  protectedOutcomes?: number
  retentionRate?: number | null
  connectorStatus?: string
  overallState?: string
}

export function checkConsistency(input: ConsistencyCheckInput): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = []

  if (input.readiness === 0 && (input.requiredActionsCount ?? 0) === 0) {
    warnings.push('READINESS_CONTRADICTION')
  }

  if ((input.protectedOutcomes ?? 0) === 0 && (input.retentionRate ?? 0) > 0) {
    warnings.push('RETENTION_CONTRADICTION')
  }

  if (input.connectorStatus === 'NOT_CONNECTED' && input.overallState === 'HEALTHY') {
    warnings.push('CONNECTOR_CONTRADICTION')
  }

  return warnings
}
