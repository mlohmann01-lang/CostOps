import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoUtilizationIntelligence } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const utilizationApiPaths = ['/api/utilization', '/api/utilization/low', '/api/utilization/opportunities']
const empty = { summary: { assetsAnalysed: 0, unusedValue: 0, lowUtilization: 0, generatedOpportunities: 0 }, records: [], low: [], opportunities: [] }

export function useUtilizationIntelligenceData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ ...demoUtilizationIntelligence, low: demoUtilizationIntelligence.records.filter((record: any) => record.utilizationBand === 'LOW' || record.utilizationBand === 'UNUSED') }), [])
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, low, opportunities] = await Promise.all([liveFetch<any>('/api/utilization'), liveFetch<any>('/api/utilization/low'), liveFetch<any>('/api/utilization/opportunities')])
      const next = { summary: all.summary ?? empty.summary, records: all.records ?? [], low: low.records ?? [], opportunities: opportunities.opportunities ?? [] }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])
  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.records.length === 0), refresh }
}
