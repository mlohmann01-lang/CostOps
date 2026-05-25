import type { OperationEventType } from './operation-events'

const refreshMap: Record<OperationEventType, string[]> = {
  RECOMMENDATION_APPROVED: ['command', 'execution', 'governance', 'intelligence'],
  RECOMMENDATION_REVIEWED: ['command', 'intelligence'],
  EXECUTION_QUEUED: ['execution', 'governance', 'intelligence'],
  EXECUTION_STARTED: ['execution', 'governance'],
  EXECUTION_COMPLETED: ['execution', 'governance', 'intelligence'],
  EXECUTION_BLOCKED: ['execution', 'command', 'governance'],
  VERIFICATION_PENDING: ['execution', 'governance'],
  VERIFICATION_COMPLETED: ['execution', 'governance', 'intelligence'],
  CONNECTOR_TESTED: ['connectors', 'command', 'intelligence'],
  CONNECTOR_DEGRADED: ['connectors', 'command', 'intelligence'],
  CONNECTOR_READY: ['connectors', 'command', 'intelligence'],
  CONNECTOR_UNAVAILABLE: ['connectors', 'command', 'intelligence'],
  CONNECTOR_CONFIG_STARTED: ['connectors', 'governance'],
  AUDIT_EVENT_CREATED: ['governance', 'audit-log'],
  INTELLIGENCE_METRICS_CHANGED: ['intelligence', 'dashboard'],
}

export function getRefreshTargets(eventType: OperationEventType): string[] {
  return refreshMap[eventType]
}
