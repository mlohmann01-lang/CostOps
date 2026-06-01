import { platformEventService } from '../events/platform-event-service'
import { monitoredOutcomeService } from './monitored-outcome-service'

export function evaluateOutcomeDrift(input: { tenantId: string; outcomeId: string; evidence?: Record<string, unknown>; verificationEvidence?: Record<string, unknown> }) {
  const evidence: any = input.verificationEvidence ?? input.evidence ?? {}
  const reasons: string[] = []
  const removed = (evidence.removedSkuIds ?? []) as string[]
  const after = (evidence.afterAssignedSkuIds ?? []) as string[]
  if (removed.some((sku) => after.includes(sku))) reasons.push('LICENSE_REASSIGNED')
  if (String(evidence.entitlementReappeared ?? 'false') === 'true') reasons.push('ENTITLEMENT_REAPPEARED')
  if (Number(evidence.verifiedMonthlySavings ?? 1) < Number(evidence.projectedMonthlySavings ?? 0)) reasons.push('SAVINGS_REGRESSION')
  if (evidence.rollbackReference && evidence.rollbackReferenceMismatch) reasons.push('ROLLBACK_MISMATCH')

  const state = reasons.length ? 'DRIFT_DETECTED' : 'RESOLVED'
  monitoredOutcomeService.update(input.tenantId, input.outcomeId, { monitoringState: state === 'DRIFT_DETECTED' ? 'DRIFT_DETECTED' : 'RESOLVED' })
  void platformEventService.recordDriftEvent(input.tenantId, state === 'DRIFT_DETECTED' ? 'DRIFT_DETECTED' : 'DRIFT_RESOLVED', {
    eventId: `${input.outcomeId}:${state}:${Date.now()}`,
    entityType: 'OUTCOME',
    entityId: input.outcomeId,
    actorId: 'system',
    title: state === 'DRIFT_DETECTED' ? 'Drift detected' : 'Drift resolved',
    description: reasons.join(',') || 'No drift detected',
    sourceSystem: 'drift-evaluation-runtime',
    metadata: { beforeState: 'MONITORED', afterState: state, evidence: reasons },
    occurredAt: new Date().toISOString(),
  }).catch(() => undefined)
  return { outcomeId: input.outcomeId, driftState: state, reasons }
}
