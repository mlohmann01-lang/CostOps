import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoRenewalIntelligence } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const renewalApiPaths = ['/api/renewals', '/api/renewals/upcoming', '/api/renewals/high-risk']
const empty = { summary: { upcomingRenewals: 0, renewalSpend: 0, recoverable: 0, highRisk: 0 }, renewals: [], upcoming: [], highRisk: [] }

export function useRenewalsData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ ...demoRenewalIntelligence, upcoming: demoRenewalIntelligence.renewals.filter((renewal: any) => renewal.daysRemaining <= 120), highRisk: demoRenewalIntelligence.renewals.filter((renewal: any) => renewal.renewalRisk === 'HIGH') }), [])
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, upcoming, highRisk] = await Promise.all([liveFetch<any>('/api/renewals'), liveFetch<any>('/api/renewals/upcoming'), liveFetch<any>('/api/renewals/high-risk')])
      const next = { summary: all.summary ?? empty.summary, renewals: all.renewals ?? [], upcoming: upcoming.renewals ?? [], highRisk: highRisk.renewals ?? [] }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])
  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.renewals.length === 0), refresh }
}
