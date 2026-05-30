import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoVendorIntelligence } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const vendorChangeApiPaths = ['/api/vendor-changes', '/api/vendor-changes/high-impact']

export function useVendorIntelligenceData() {
  const workspace = useWorkspace()
  const [data, setData] = useState<any>({ summary: { vendorChangesDetected: 0, highImpact: 0, affectedSpend: 0, generatedOpportunities: 0 }, changes: [], highImpactChanges: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const demo = useMemo(() => ({ ...demoVendorIntelligence, highImpactChanges: demoVendorIntelligence.changes.filter((change: any) => change.impactSeverity === 'HIGH' || change.impactSeverity === 'CRITICAL') }), [])

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData({ summary: { vendorChangesDetected: 0, highImpact: 0, affectedSpend: 0, generatedOpportunities: 0 }, changes: [], highImpactChanges: [] }); setError(null); return null }
    setLoading(true)
    try {
      const [all, high] = await Promise.all([liveFetch<any>('/api/vendor-changes'), liveFetch<any>('/api/vendor-changes/high-impact')])
      const next = { summary: all.summary ?? {}, changes: all.changes ?? [], highImpactChanges: high.changes ?? [] }
      setData(next); setError(null); return next
    } catch (err) { setData({ summary: { vendorChangesDetected: 0, highImpact: 0, affectedSpend: 0, generatedOpportunities: 0 }, changes: [], highImpactChanges: [] }); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])

  const assessChange = useCallback(async (id: string) => {
    if (workspace.mode === 'demo') return { impact: demo.changes.find((change: any) => change.id === id) }
    return liveFetch(`/api/vendor-changes/${encodeURIComponent(id)}/assess`, { method: 'POST' })
  }, [workspace.mode, demo])

  const generateOpportunities = useCallback(async (id: string) => {
    if (workspace.mode === 'demo') return { opportunities: demo.changes.filter((change: any) => change.id === id).map((change: any) => ({ opportunityId: `demo-${change.id}`, recommendationSource: 'VENDOR_CHANGE', title: `${change.title} opportunity` })) }
    return liveFetch(`/api/vendor-changes/${encodeURIComponent(id)}/generate-opportunities`, { method: 'POST' })
  }, [workspace.mode, demo])

  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.changes.length === 0), refresh, assessChange, generateOpportunities }
}
