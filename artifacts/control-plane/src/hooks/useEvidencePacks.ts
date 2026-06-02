import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoEvidencePacks } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export function useEvidencePacks() {
  const workspace = useWorkspace()
  const [data, setData] = useState<any>(demoEvidencePacks)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') { setData(demoEvidencePacks); setError(null); return demoEvidencePacks }
    setLoading(true)
    try { const payload: any = await liveFetch('/api/evidence-packs'); const packs = payload.evidencePacks ?? []; setData({ summary: packs[0]?.summary ?? {}, coverage: packs[0]?.metrics?.confidence ?? {}, packs }); setError(null); return payload } catch (err) { const next = normalizeApiError(err); setError(next); throw next } finally { setLoading(false) }
  }, [workspace.mode])
  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])
  const generate = useCallback(async (scope = 'TENANT', targetId?: string) => { if (workspace.mode === 'demo') return refresh(); const pack = await liveFetch('/api/evidence-packs/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scope, targetId }) }); await refresh(); return pack }, [workspace.mode, refresh])
  return useMemo(() => ({ data, loading, error, refresh, generate }), [data, loading, error, refresh, generate])
}
