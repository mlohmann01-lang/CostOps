import { useWorkspace } from '../lib/workspaceContext'
import {
  DEMO_OUTCOME_RECORDS,
  DEMO_LEDGER_EVENTS,
  buildOutcomeLedgerSummary,
  type OutcomeRecord,
  type OutcomeLedgerEvent,
  type OutcomeLedgerSummary,
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

export function useCanonicalOutcomeLedger(): CanonicalOutcomeLedgerResult {
  const workspace = useWorkspace()

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
    records: [],
    events: [],
    summary: EMPTY_SUMMARY,
    dataState: 'NO_DATA',
    isEmptyLive: true,
    loading: false,
    error: null,
  }
}
