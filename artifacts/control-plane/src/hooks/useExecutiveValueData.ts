import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoExecutiveValueBlockers, demoExecutiveValueDomains, demoExecutiveValueSummary, demoExecutiveValueTopDrivers } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export function useExecutiveValueData() {
  const workspace = useWorkspace()
  const emptySummary = { valueMetrics: {}, confidence: {}, counts: {} }
  const [summary, setSummary] = useState<any>(workspace.mode === 'demo' ? demoExecutiveValueSummary : emptySummary)
  const [domains, setDomains] = useState<any[]>(workspace.mode === 'demo' ? demoExecutiveValueDomains : [])
  const [topDrivers, setTopDrivers] = useState<any[]>(workspace.mode === 'demo' ? demoExecutiveValueTopDrivers : [])
  const [blockers, setBlockers] = useState<any[]>(workspace.mode === 'demo' ? demoExecutiveValueBlockers : [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') { setSummary(demoExecutiveValueSummary); setDomains(demoExecutiveValueDomains); setTopDrivers(demoExecutiveValueTopDrivers); setBlockers(demoExecutiveValueBlockers); setError(null); return demoExecutiveValueSummary }
    if (!workspace.dataReady) { setSummary(emptySummary); setDomains([]); setTopDrivers([]); setBlockers([]); setError(null); return emptySummary }
    setLoading(true)
    try {
      const [nextSummary, nextDomains, nextDrivers, nextBlockers]: any[] = await Promise.all([liveFetch('/api/executive-value/summary'), liveFetch('/api/executive-value/domains'), liveFetch('/api/executive-value/top-drivers'), liveFetch('/api/executive-value/blockers')])
      setSummary(nextSummary); setDomains(nextDomains.domains ?? []); setTopDrivers(nextDrivers.topDrivers ?? []); setBlockers(nextBlockers.blockers ?? []); setError(null); return nextSummary
    } catch (err) { const next = normalizeApiError(err); setError(next); throw next } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  const generateEvidencePack = useCallback(async () => {
    if (workspace.mode === 'demo') return { evidencePackId: 'ep-executive-demo', scope: 'TENANT', status: 'COMPLETE' }
    if (!workspace.dataReady) return { status: 'UNAVAILABLE' }
    setLoading(true)
    try { const pack = await liveFetch('/api/executive-value/evidence-pack', { method: 'POST' }); await refresh(); return pack } catch (err) { const next = normalizeApiError(err); setError(next); throw next } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, refresh])

  return useMemo(() => ({ summary, domains, topDrivers, blockers, loading, error, refresh, generateEvidencePack, isDemo: workspace.mode === 'demo', dataReady: workspace.dataReady }), [summary, domains, topDrivers, blockers, loading, error, refresh, generateEvidencePack, workspace.mode, workspace.dataReady])
}
