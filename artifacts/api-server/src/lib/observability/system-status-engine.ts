import type { ConnectorHealthState } from './connector-health';
import type { RuntimeMetrics } from './runtime-metrics';
export type RuntimeStatus = 'OPERATIONAL'|'DEGRADED'|'PARTIAL_OUTAGE'|'MAINTENANCE'|'BLOCKED';
export function aggregateRuntimeStatus(input:{connectors:ConnectorHealthState[]; schedulerHealthy:boolean; maintenanceMode?:boolean; metrics:RuntimeMetrics;}): RuntimeStatus {
  if (input.maintenanceMode) return 'MAINTENANCE';
  if (!input.schedulerHealthy) return 'BLOCKED';
  if (input.connectors.some((c)=>c==='UNAVAILABLE' || c==='AUTH_FAILURE')) return 'PARTIAL_OUTAGE';
  if (input.connectors.some((c)=>c==='DEGRADED' || c==='RATE_LIMITED' || c==='STALE_DATA') || input.metrics.failedVerificationCount>0 || input.metrics.staleApprovalCount>0) return 'DEGRADED';
  return 'OPERATIONAL';
}
