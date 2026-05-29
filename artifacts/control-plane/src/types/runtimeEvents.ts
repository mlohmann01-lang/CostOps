export type RuntimeEventCategory =
  | 'RECOMMENDATION'
  | 'APPROVAL'
  | 'EXECUTION'
  | 'OUTCOME'
  | 'DRIFT'
  | 'CONNECTOR'
  | 'GOVERNANCE'
  | 'AUDIT'
  | 'SYSTEM'

export type RuntimeEventType =
  | 'RECOMMENDATION_CREATED'
  | 'RECOMMENDATION_UPDATED'
  | 'APPROVAL_SUBMITTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_REJECTED'
  | 'EXECUTION_REQUESTED'
  | 'DRY_RUN_STARTED'
  | 'DRY_RUN_COMPLETED'
  | 'DRY_RUN_BLOCKED'
  | 'EXECUTION_STARTED'
  | 'EXECUTION_COMPLETED'
  | 'EXECUTION_FAILED'
  | 'OUTCOME_VERIFICATION_STARTED'
  | 'OUTCOME_VERIFIED'
  | 'OUTCOME_PARTIALLY_VERIFIED'
  | 'OUTCOME_VERIFICATION_FAILED'
  | 'OUTCOME_FAILED'
  | 'DRIFT_DETECTED'
  | 'DRIFT_RESOLVED'
  | 'DRIFT_ESCALATED'
  | 'CONNECTOR_DEGRADED'
  | 'CONNECTOR_RECOVERED'
  | 'GOVERNANCE_POLICY_CHANGED'
  | 'AUDIT_PACK_GENERATED'
  | 'SYSTEM_HEALTH_CHANGED'
  | 'SCHEDULE_CREATED'
  | 'SCHEDULE_READY'
  | 'SCHEDULE_BLOCKED'
  | 'SCHEDULE_CANCELLED'

export type RuntimeEventSeverity = 'info' | 'success' | 'warning' | 'error'

export interface RuntimeEvent {
  eventId: string
  tenantId: string
  category: RuntimeEventCategory
  type: RuntimeEventType
  entityType: string
  entityId: string
  message: string
  severity: RuntimeEventSeverity
  createdAt: string
  actorId?: string
  actorLabel?: string
  payload?: Record<string, unknown>
}
