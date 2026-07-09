import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type DecisionTrustSnapshot = { trustScore: number; trustLevel: string; trustSource: string; capturedAt: string }
export type Decision = {
  id: string
  decisionType: string
  status: string
  title: string
  rationale: string[]
  sourceSystem: string
  sourceReference: string
  trustSnapshot?: DecisionTrustSnapshot
}

export type DecisionContextData = { decision: Decision | null; dataState: DataState; error?: string }

export function demoDecision(sourceSystem: string, sourceReference: string): Decision {
  return {
    id: 'demo-decision', decisionType: 'EXECUTION_APPROVAL', status: 'EXECUTED',
    title: `Execution approved for ${sourceReference}`,
    rationale: ['utilisation remained below threshold for 90 days', 'trust score exceeded threshold'],
    sourceSystem, sourceReference,
    trustSnapshot: { trustScore: 88, trustLevel: 'HIGH', trustSource: 'connector-trust', capturedAt: new Date().toISOString() },
  }
}

export function useDecisionContext(sourceSystem?: string, sourceReference?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<DecisionContextData>({ decision: null, dataState: 'DEMO' })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!sourceSystem || !sourceReference) { setData({ decision: null, dataState: 'NO_DATA' }); return }
    if (workspace.mode === 'demo') { setData({ decision: demoDecision(sourceSystem, sourceReference), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData({ decision: null, dataState: 'NOT_CONNECTED' }); return }
    setLoading(true)
    try {
      const rows = await liveFetch<Decision[]>(`/api/decisions?sourceSystem=${encodeURIComponent(sourceSystem)}&sourceReference=${encodeURIComponent(sourceReference)}`)
      const decision = rows?.[0] ?? null
      setData({ decision, dataState: decision ? 'LIVE' : 'NO_DATA' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData({ decision: null, dataState: 'NO_DATA', error: err.message })
    } finally { setLoading(false) }
  }, [sourceSystem, sourceReference, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
