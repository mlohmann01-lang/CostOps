import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoBenchmarkIntelligence } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const benchmarkApiPaths = ['/api/benchmarks', '/api/benchmarks/high-impact', '/api/benchmarks/opportunities']
const empty = { summary: { benchmarksEvaluated: 0, highImpactGaps: 0, recoverableValue: 0, generatedOpportunities: 0 }, benchmarks: [], highImpact: [], opportunities: [] }

export function useBenchmarkIntelligenceData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ ...demoBenchmarkIntelligence, highImpact: demoBenchmarkIntelligence.benchmarks.filter((benchmark: any) => benchmark.impactLevel === 'HIGH') }), [])
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, high, opportunities] = await Promise.all([liveFetch<any>('/api/benchmarks'), liveFetch<any>('/api/benchmarks/high-impact'), liveFetch<any>('/api/benchmarks/opportunities')])
      const next = { summary: all.summary ?? empty.summary, benchmarks: all.benchmarks ?? [], highImpact: high.benchmarks ?? [], opportunities: opportunities.opportunities ?? [] }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])
  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.benchmarks.length === 0), refresh }
}
