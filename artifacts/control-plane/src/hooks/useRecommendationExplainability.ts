import { useCallback, useEffect, useState } from 'react'
import { demoRecommendationExplainability } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export function useRecommendationExplainability(recommendationId?: string | null) {
  const workspace = useWorkspace()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const refresh = useCallback(async () => {
    if (!recommendationId) { setData(null); setError(null); return null }
    if (workspace.mode === 'demo') { const next = (demoRecommendationExplainability as any)[recommendationId] ?? null; setData(next); setError(null); return next }
    if (!workspace.dataReady) { setData(null); setError(null); return null }
    setLoading(true)
    try { const next = await liveFetch(`/api/recommendations/${encodeURIComponent(recommendationId)}/explain`); setData(next); setError(null); return next }
    catch (err) { const e = normalizeApiError(err); setData(null); setError(e); return null }
    finally { setLoading(false) }
  }, [recommendationId, workspace.mode, workspace.dataReady])
  useEffect(() => { void refresh() }, [refresh])
  return { data, error, loading, refresh }
}
