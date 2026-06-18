import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoExecutivePriorities, demoExecutivePrioritySummary } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const executivePrioritiesApiPaths = ['/api/priorities', '/api/priorities/top', '/api/priorities/summary']
const empty = { priorities: [], topPriorities: [], summary: { totalOpportunities: 0, topFiveMonthlySavings: 0, topFiveAnnualSavings: 0, readyNowCount: 0, approvalRequiredCount: 0, blockedCount: 0, confidenceBand: 'LOW', executionReadinessPercent: 0, topOpportunityTitle: 'None', topOpportunityValue: 0 } }

export type ExecutivePrioritiesDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useExecutivePrioritiesData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ priorities: demoExecutivePriorities, topPriorities: demoExecutivePriorities.slice(0, 5), summary: demoExecutivePrioritySummary, dataState: 'DEMO' as ExecutivePrioritiesDataState }), [])
  const notConnected = useMemo(() => ({ ...empty, dataState: 'NOT_CONNECTED' as ExecutivePrioritiesDataState }), [])
  const [data, setData] = useState<any>({ ...empty, dataState: 'NOT_CONNECTED' as ExecutivePrioritiesDataState })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') { setData(demo); return demo }
    if (!workspace.dataReady) { setData(notConnected); setError(null); return notConnected }
    setLoading(true)
    try {
      const [all, top, summary] = await Promise.all([liveFetch<any>('/api/priorities'), liveFetch<any>('/api/priorities/top'), liveFetch<any>('/api/priorities/summary')])
      const priorities = all.priorities ?? []
      const next = { priorities, topPriorities: top.priorities ?? [], summary: summary ?? empty.summary, dataState: (priorities.length === 0 ? 'NO_DATA' : 'LIVE') as ExecutivePrioritiesDataState }
      setData(next); setError(null); return next
    } catch (err) {
      const fallback = { ...empty, dataState: 'NO_DATA' as ExecutivePrioritiesDataState }
      setData(fallback); setError(normalizeApiError(err)); return fallback
    }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo, notConnected])

  useEffect(() => { void refresh() }, [refresh])
  const active = workspace.mode === 'demo' ? demo : data
  return { data: active, priorities: active.priorities, topPriorities: active.topPriorities, summary: active.summary, dataState: active.dataState as ExecutivePrioritiesDataState, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.priorities.length === 0), refresh }
}
