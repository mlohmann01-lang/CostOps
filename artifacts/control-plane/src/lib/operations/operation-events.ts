export const OPERATION_EVENTS = [
  'RECOMMENDATION_APPROVED',
  'RECOMMENDATION_REVIEWED',
  'EXECUTION_QUEUED',
  'EXECUTION_STARTED',
  'EXECUTION_COMPLETED',
  'EXECUTION_BLOCKED',
  'VERIFICATION_PENDING',
  'VERIFICATION_COMPLETED',
  'CONNECTOR_TESTED',
  'CONNECTOR_DEGRADED',
  'CONNECTOR_READY',
  'CONNECTOR_UNAVAILABLE',
  'CONNECTOR_CONFIG_STARTED',
  'AUDIT_EVENT_CREATED',
  'INTELLIGENCE_METRICS_CHANGED',
] as const

export type OperationEventType = (typeof OPERATION_EVENTS)[number]

export interface OperationEvent {
  type: OperationEventType
  entityId?: string
  timestamp: string
  demo?: boolean
  message?: string
}
