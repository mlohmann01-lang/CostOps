import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoExecutivePriorities, demoExecutivePrioritySummary } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const executivePrioritiesApiPaths = ['/api/priorities', '/api/priorities/top', '/api/priorities/summary']
const empty = { priorities: [], topPriorities: [], summary: { totalOpportunities: 0, topFiveMonthlySavings: 0, topFiveAnnualSavings: 0, readyNowCount: 0, approvalRequiredCount: 0, blockedCount: 0, confidenceBand: 'LOW', executionReadinessPercent: 0, topOpportunityTitle: 'None', topOpportunityValue: 0 } }

export function useExecutivePrioritiesData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ priorities: demoExecutivePriorities, topPriorities: demoExecutivePriorities.slice(0, 5), summary: demoExecutivePrioritySummary }), [])
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, top, summary] = await Promise.all([liveFetch<any>('/api/priorities'), liveFetch<any>('/api/priorities/top'), liveFetch<any>('/api/priorities/summary')])
      const next = { priorities: all.priorities ?? [], topPriorities: top.priorities ?? [], summary: summary ?? empty.summary }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])
  return { data: workspace.mode === 'demo' ? demo : data, priorities: (workspace.mode === 'demo' ? demo : data).priorities, topPriorities: (workspace.mode === 'demo' ? demo : data).topPriorities, summary: (workspace.mode === 'demo' ? demo : data).summary, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.priorities.length === 0), refresh }
}
