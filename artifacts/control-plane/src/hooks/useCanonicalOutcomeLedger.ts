import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'
import {
  DEMO_OUTCOME_RECORDS,
  DEMO_LEDGER_EVENTS,
  buildOutcomeLedgerSummary,
  type OutcomeRecord,
  type OutcomeLedgerEvent,
  type OutcomeLedgerEventType,
  type OutcomeLedgerSummary,
  type OutcomeLifecycleStage,
  type OutcomeSourceDomain,
} from '../lib/outcomeLedger/outcomeLedger'

export type CanonicalLedgerDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export interface CanonicalOutcomeLedgerResult {
  records: OutcomeRecord[]
  events: OutcomeLedgerEvent[]
  summary: OutcomeLedgerSummary
  dataState: CanonicalLedgerDataState
  isEmptyLive: boolean
  loading: boolean
  error: string | null
}

const EMPTY_SUMMARY = buildOutcomeLedgerSummary([])

// The live /api/outcomes/proof endpoint returns OutcomeProof rows (see
// artifacts/api-server/src/lib/outcomes/outcome-proof-types.ts) — a richer,
// differently-shaped record than the canonical OutcomeRecord/OutcomeLedgerEvent
// schema this hook exposes. These map known proof-state/domain/stage strings
// onto the canonical enums; anything unrecognised falls back to the closest
// honest default rather than being silently dropped.
const DOMAIN_MAP: Record<string, OutcomeSourceDomain> = {
  m365: 'M365', ai: 'AI', saas: 'SAAS', cloud: 'CLOUD', itam: 'ITAM', servicenow: 'SERVICENOW', finance: 'FINANCE',
}
function mapDomain(domain: unknown): OutcomeSourceDomain {
  return DOMAIN_MAP[String(domain ?? '').toLowerCase()] ?? 'MANUAL'
}
const STAGE_MAP: Record<string, OutcomeLifecycleStage> = {
  projected: 'PROJECTED', approved: 'APPROVED', executed: 'EXECUTED', verified: 'VERIFIED',
  retained: 'PROTECTED', protected: 'PROTECTED', closed: 'PROTECTED', drifted: 'DRIFTED', failed: 'FAILED',
}
function mapStage(stage: unknown): OutcomeLifecycleStage {
  return STAGE_MAP[String(stage ?? '').toLowerCase()] ?? 'PROJECTED'
}
const EVENT_TYPE_MAP: Record<string, OutcomeLedgerEventType> = {
  projected: 'OUTCOME_PROJECTED', approved: 'OUTCOME_APPROVED', executed: 'ACTION_EXECUTED', verified: 'OUTCOME_VERIFIED',
  retained: 'VALUE_PROTECTED', protected: 'VALUE_PROTECTED', drifted: 'VALUE_DRIFTED', failed: 'OUTCOME_FAILED',
}
function mapEventType(stage: unknown): OutcomeLedgerEventType {
  return EVENT_TYPE_MAP[String(stage ?? '').toLowerCase()] ?? 'VALUE_ADJUSTED'
}
function evidenceIdsForStage(timeline: any[], stageNames: string[]): string[] {
  const wanted = new Set(stageNames)
  return timeline
    .filter((event) => wanted.has(String(event?.stage ?? '').toLowerCase()))
    .map((event) => event?.evidenceRef ?? event?.eventId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

export function normalizeCanonicalOutcomeLedger(payload: unknown): { records: OutcomeRecord[]; events: OutcomeLedgerEvent[] } {
  const proofs: any[] = Array.isArray((payload as any)?.proofs) ? (payload as any).proofs : []
  const records: OutcomeRecord[] = []
  const events: OutcomeLedgerEvent[] = []

  for (const proof of proofs) {
    const outcomeId = String(proof?.outcomeId ?? '')
    if (!outcomeId) continue
    const tenantId = String(proof?.tenantId ?? '')
    const timeline: any[] = Array.isArray(proof?.proofTimeline) ? proof.proofTimeline : []
    const evidenceSummary = proof?.evidenceSummary ?? {}
    const evidenceFlags = [
      evidenceSummary.hasProjectionEvidence, evidenceSummary.hasApprovalEvidence, evidenceSummary.hasExecutionEvidence,
      evidenceSummary.hasVerificationEvidence, evidenceSummary.hasRetentionEvidence, evidenceSummary.hasDriftProtectionEvidence,
    ]
    const evidenceCoverage = evidenceFlags.length
      ? Math.round((evidenceFlags.filter(Boolean).length / evidenceFlags.length) * 100)
      : undefined
    const lifecycleStage = mapStage(proof?.proofState)

    records.push({
      id: outcomeId,
      tenantId,
      name: String(proof?.sourcePlaybook ?? `Outcome ${outcomeId}`),
      sourceDomain: mapDomain(proof?.domain),
      outcomeType: 'COST_REDUCTION',
      lifecycleStage,
      proofState: lifecycleStage,
      costCentre: proof?.costCentre ?? undefined,
      businessUnit: proof?.team ?? undefined,
      projectedValue: Number(proof?.projectedMonthlySavings ?? 0),
      approvedValue: proof?.approvedMonthlySavings != null ? Number(proof.approvedMonthlySavings) : undefined,
      executedValue: proof?.executedMonthlySavings != null ? Number(proof.executedMonthlySavings) : undefined,
      verifiedValue: proof?.verifiedMonthlySavings != null ? Number(proof.verifiedMonthlySavings) : undefined,
      protectedValue: proof?.protectedMonthlySavings != null ? Number(proof.protectedMonthlySavings) : undefined,
      evidenceCoverage,
      approvalEvidenceIds: evidenceIdsForStage(timeline, ['approved']),
      executionEvidenceIds: evidenceIdsForStage(timeline, ['executed']),
      verificationEvidenceIds: evidenceIdsForStage(timeline, ['verified']),
      financeEvidenceIds: [],
      protectionEvidenceIds: evidenceIdsForStage(timeline, ['retained', 'protected']),
      createdAt: String(proof?.createdAt ?? new Date().toISOString()),
      updatedAt: String(proof?.updatedAt ?? new Date().toISOString()),
      stageChangedAt: timeline.length ? timeline[timeline.length - 1]?.occurredAt : undefined,
    })

    timeline.forEach((event, index) => {
      events.push({
        id: String(event?.eventId ?? `${outcomeId}-${event?.stage ?? index}-${event?.occurredAt ?? index}`),
        tenantId,
        outcomeId,
        eventType: mapEventType(event?.stage),
        toStage: mapStage(event?.stage),
        evidenceIds: event?.evidenceRef ? [event.evidenceRef] : [],
        actorId: event?.actorId ?? undefined,
        createdAt: String(event?.occurredAt ?? new Date().toISOString()),
      })
    })
  }

  return { records, events }
}

export function useCanonicalOutcomeLedger(): CanonicalOutcomeLedgerResult {
  const workspace = useWorkspace()
  const live = useLiveResource({
    path: '/api/outcomes/proof',
    enabled: workspace.mode === 'live',
    initialData: { records: [] as OutcomeRecord[], events: [] as OutcomeLedgerEvent[] },
    normalizer: normalizeCanonicalOutcomeLedger,
    isEmpty: (data) => data.records.length === 0,
  })

  if (workspace.mode === 'demo') {
    return {
      records: DEMO_OUTCOME_RECORDS,
      events: DEMO_LEDGER_EVENTS,
      summary: buildOutcomeLedgerSummary(DEMO_OUTCOME_RECORDS),
      dataState: 'DEMO',
      isEmptyLive: false,
      loading: false,
      error: null,
    }
  }

  if (!workspace.dataReady) {
    return {
      records: [],
      events: [],
      summary: EMPTY_SUMMARY,
      dataState: 'NOT_CONNECTED',
      isEmptyLive: true,
      loading: false,
      error: null,
    }
  }

  return {
    records: live.data.records,
    events: live.data.events,
    summary: live.data.records.length ? buildOutcomeLedgerSummary(live.data.records) : EMPTY_SUMMARY,
    dataState: live.isEmpty ? 'NO_DATA' : 'LIVE',
    isEmptyLive: live.isEmpty,
    loading: live.loading,
    error: live.error?.message ?? null,
  }
}
