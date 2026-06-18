import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoExecutiveValueBlockers, demoExecutiveValueDomains, demoExecutiveValueSummary, demoExecutiveValueTopDrivers } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export type ExecutiveValueDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'
const emptyExecutiveValueSummary: any = { valueMetrics: {}, confidence: {}, counts: {} }

export function useExecutiveValueData() {
  const workspace = useWorkspace()
  const [summary, setSummary] = useState<any>(demoExecutiveValueSummary)
  const [domains, setDomains] = useState<any[]>(demoExecutiveValueDomains)
  const [topDrivers, setTopDrivers] = useState<any[]>(demoExecutiveValueTopDrivers)
  const [blockers, setBlockers] = useState<any[]>(demoExecutiveValueBlockers)
  const [dataState, setDataState] = useState<ExecutiveValueDataState>('DEMO')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') { setSummary(demoExecutiveValueSummary); setDomains(demoExecutiveValueDomains); setTopDrivers(demoExecutiveValueTopDrivers); setBlockers(demoExecutiveValueBlockers); setDataState('DEMO'); setError(null); return demoExecutiveValueSummary }
    if (!workspace.dataReady) { setSummary(emptyExecutiveValueSummary); setDomains([]); setTopDrivers([]); setBlockers([]); setDataState('NOT_CONNECTED'); setError(null); return emptyExecutiveValueSummary }
    setLoading(true)
    try {
      const [nextSummary, nextDomains, nextDrivers, nextBlockers]: any[] = await Promise.all([liveFetch('/api/executive-value/summary'), liveFetch('/api/executive-value/domains'), liveFetch('/api/executive-value/top-drivers'), liveFetch('/api/executive-value/blockers')])
      const normalizedDomains = nextDomains.domains ?? []
      const normalizedDrivers = nextDrivers.topDrivers ?? []
      setSummary(nextSummary); setDomains(normalizedDomains); setTopDrivers(normalizedDrivers); setBlockers(nextBlockers.blockers ?? [])
      setDataState(normalizedDomains.length === 0 && normalizedDrivers.length === 0 ? 'NO_DATA' : 'LIVE')
      setError(null); return nextSummary
    } catch (err) {
      const next = normalizeApiError(err)
      setSummary(emptyExecutiveValueSummary); setDomains([]); setTopDrivers([]); setBlockers([])
      setDataState('NO_DATA'); setError(next); throw next
    } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  const generateEvidencePack = useCallback(async () => {
    if (workspace.mode === 'demo') return { evidencePackId: 'ep-executive-demo', scope: 'TENANT', status: 'COMPLETE' }
    setLoading(true)
    try { const pack = await liveFetch('/api/executive-value/evidence-pack', { method: 'POST' }); await refresh(); return pack } catch (err) { const next = normalizeApiError(err); setError(next); throw next } finally { setLoading(false) }
  }, [workspace.mode, refresh])

  return useMemo(() => ({ summary, domains, topDrivers, blockers, dataState, loading, error, refresh, generateEvidencePack }), [summary, domains, topDrivers, blockers, dataState, loading, error, refresh, generateEvidencePack])
}
