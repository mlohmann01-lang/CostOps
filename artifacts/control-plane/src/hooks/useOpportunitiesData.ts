import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoOpportunities } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const opportunityApiPaths = ['/api/opportunities', '/api/opportunities/top']
const empty = { summary: { openOpportunities: 0, projectedSavings: 0, critical: 0, eligible: 0 }, opportunities: [], top: [] }

export function useOpportunitiesData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ ...demoOpportunities, top: demoOpportunities.opportunities.slice(0, 3) }), [])
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, top] = await Promise.all([liveFetch<any>('/api/opportunities'), liveFetch<any>('/api/opportunities/top')])
      const next = { summary: all.summary ?? empty.summary, opportunities: all.opportunities ?? [], top: top.opportunities ?? [] }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])
  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.opportunities.length === 0), refresh }
}
