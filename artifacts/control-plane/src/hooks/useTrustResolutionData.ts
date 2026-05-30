import { useCallback, useEffect, useState } from 'react'
import { demoTrustResolutionFindings } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export function useTrustResolutionData(findingId?: string | null) {
  const workspace = useWorkspace()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const refresh = useCallback(async () => {
    if (!findingId) { setData(null); setError(null); return null }
    if (workspace.mode === 'demo') { const finding = demoTrustResolutionFindings.find((item) => item.findingId === findingId) ?? null; setData(finding); setError(null); return finding }
    if (!workspace.dataReady) { setData(null); setError(null); return null }
    setLoading(true)
    try { const next = await liveFetch(`/api/trust/findings/${encodeURIComponent(findingId)}/affected-recommendations`); setData(next); setError(null); return next }
    catch (err) { const e = normalizeApiError(err); setData(null); setError(e); return null }
    finally { setLoading(false) }
  }, [findingId, workspace.mode, workspace.dataReady])
  useEffect(() => { void refresh() }, [refresh])
  return { data, error, loading, refresh }
}
