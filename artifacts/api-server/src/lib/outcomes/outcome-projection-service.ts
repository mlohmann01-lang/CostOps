import { appendUnifiedEvent } from '../events/evidence-timeline'

export type OutcomeProjection = {
  tenantId: string
  outcomeId: string
  recommendationId?: string | null
  executionRequestId?: string
  projectedMonthlySavings: number
  verifiedMonthlySavings: number
  projectedAnnualSavings: number
  verifiedAnnualSavings: number
  variance: number
  outcomeState: string
  verificationDate: string
}

const projections = new Map<string, OutcomeProjection[]>()
const key = (tenantId: string) => tenantId

function activityEventType(state: string) {
  if (state === 'VERIFIED') return 'OUTCOME_VERIFIED'
  if (state === 'PARTIALLY_VERIFIED') return 'OUTCOME_PARTIALLY_VERIFIED'
  return 'OUTCOME_FAILED'
}

export class OutcomeProjectionService {
  project(outcome: any): OutcomeProjection {
    const row: OutcomeProjection = {
      tenantId: String(outcome.tenantId),
      outcomeId: String(outcome.outcomeId),
      recommendationId: outcome.recommendationId ?? null,
      executionRequestId: outcome.executionRequestId,
      projectedMonthlySavings: Number(outcome.projectedMonthlySavings ?? 0),
      verifiedMonthlySavings: Number(outcome.verifiedMonthlySavings ?? 0),
      projectedAnnualSavings: Number(outcome.projectedAnnualSavings ?? 0),
      verifiedAnnualSavings: Number(outcome.verifiedAnnualSavings ?? 0),
      variance: Number(outcome.savingsVariance ?? 0),
      outcomeState: String(outcome.verificationState),
      verificationDate: new Date(outcome.verifiedAt ?? outcome.lastCheckedAt ?? Date.now()).toISOString(),
    }
    const rows = (projections.get(key(row.tenantId)) ?? []).filter((projection) => projection.outcomeId !== row.outcomeId)
    projections.set(key(row.tenantId), [row, ...rows])
    appendUnifiedEvent({
      eventId: `${row.outcomeId}:${activityEventType(row.outcomeState)}:${row.verificationDate}`,
      tenantId: row.tenantId,
      entityType: 'OUTCOME',
      entityId: row.outcomeId,
      eventType: activityEventType(row.outcomeState),
      eventCategory: 'OUTCOME',
      actorId: 'system',
      actorRole: 'SYSTEM',
      eventReason: `Outcome projection updated: ${row.outcomeState}`,
      beforeState: 'PROJECTING',
      afterState: row.outcomeState,
      evidenceSnapshot: row,
      sourceSystem: 'outcome-projection-service',
      createdAt: row.verificationDate,
    })
    return row
  }

  list(tenantId: string) {
    return projections.get(key(tenantId)) ?? []
  }

  commandMetrics(tenantId: string) {
    const rows = this.list(tenantId)
    return {
      totalVerifiedSavings: rows.reduce((sum, row) => sum + row.verifiedMonthlySavings, 0),
      verifiedOutcomeCount: rows.filter((row) => row.outcomeState === 'VERIFIED').length,
      pendingVerificationCount: rows.filter((row) => row.outcomeState === 'PENDING_VERIFICATION' || row.outcomeState === 'PARTIALLY_VERIFIED').length,
      failedVerificationCount: rows.filter((row) => row.outcomeState === 'VERIFICATION_FAILED').length,
    }
  }

  campaignProjections(tenantId: string) {
    const rows = this.list(tenantId)
    const total = rows.length
    const failed = rows.filter((row) => row.outcomeState === 'VERIFICATION_FAILED').length
    const verified = rows.filter((row) => row.outcomeState === 'VERIFIED').length
    return total ? [{
      campaignId: `campaign-${tenantId}-outcomes`,
      id: `campaign-${tenantId}-outcomes`,
      tenantId,
      name: 'Verified outcome campaign',
      projectedSavings: rows.reduce((sum, row) => sum + row.projectedMonthlySavings, 0),
      verifiedSavings: rows.reduce((sum, row) => sum + row.verifiedMonthlySavings, 0),
      progress: total ? Math.round((verified / total) * 100) : 0,
      outcomeStatus: failed ? 'PARTIALLY_VERIFIED' : verified === total ? 'COMPLETED' : 'ACTIVE',
      driftStatus: 'MONITORED',
      approvals: { pending: 0, approved: verified, blocked: failed },
    }] : []
  }

  clear(tenantId?: string) {
    if (tenantId) projections.delete(key(tenantId))
    else projections.clear()
  }
}

export const outcomeProjectionService = new OutcomeProjectionService()
