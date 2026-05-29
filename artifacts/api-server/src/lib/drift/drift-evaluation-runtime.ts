import { appendUnifiedEvent } from '../events/evidence-timeline'
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
  appendUnifiedEvent({
    eventId: `${input.outcomeId}:${state}:${Date.now()}`,
    tenantId: input.tenantId,
    entityType: 'OUTCOME',
    entityId: input.outcomeId,
    eventType: state,
    eventCategory: 'DRIFT',
    actorId: 'system',
    actorRole: 'SYSTEM',
    eventReason: reasons.join(',') || 'No drift detected',
    beforeState: 'MONITORED',
    afterState: state,
    evidenceSnapshot: reasons,
    sourceSystem: 'drift-evaluation-runtime',
    createdAt: new Date().toISOString(),
  })
  return { outcomeId: input.outcomeId, driftState: state, reasons }
}
