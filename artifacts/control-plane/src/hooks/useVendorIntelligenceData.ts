import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoVendorIntelligence } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const vendorChangeApiPaths = ['/api/vendor-changes', '/api/vendor-changes/high-impact']
export const vendorChangePipelineApiPaths = ['/api/vendor-changes/signals', '/api/vendor-changes/pipeline/health', '/api/vendor-changes/signals/ingest', '/api/vendor-changes/:id/promote-to-opportunity']
const legacyVendorOpportunityPath = '/generate-opportunities'
type DemoVendorIntelligence = typeof demoVendorIntelligence
type DemoImpact = DemoVendorIntelligence['impacts'][keyof DemoVendorIntelligence['impacts']]
type DemoOpportunityPipeline = DemoVendorIntelligence['opportunityPipeline'][keyof DemoVendorIntelligence['opportunityPipeline']]

const empty = { summary: { vendorChangesDetected: 0, highImpact: 0, affectedSpend: 0, generatedOpportunities: 0 }, changes: [], highImpactChanges: [], signals: [], pipelineHealth: {}, impacts: {}, opportunityPipeline: {} }

export function useVendorIntelligenceData() {
  const workspace = useWorkspace()
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const demo = useMemo(() => ({ ...demoVendorIntelligence, highImpactChanges: demoVendorIntelligence.changes.filter((change: any) => change.impactSeverity === 'HIGH' || change.impactSeverity === 'CRITICAL') }), [])
  const demoImpacts = useMemo<Record<string, DemoImpact>>(() => demo.impacts, [demo])
  const demoOpportunityPipeline = useMemo<Record<string, DemoOpportunityPipeline>>(() => demo.opportunityPipeline, [demo])

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, high, signals, health] = await Promise.all([liveFetch<any>('/api/vendor-changes'), liveFetch<any>('/api/vendor-changes/high-impact'), liveFetch<any>('/api/vendor-changes/signals'), liveFetch<any>('/api/vendor-changes/pipeline/health')])
      const next = { summary: all.summary ?? {}, changes: all.changes ?? [], highImpactChanges: high.changes ?? [], signals: signals.signals ?? [], pipelineHealth: health ?? {}, impacts: {}, opportunityPipeline: {} }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])

  const ingestSignal = useCallback(async (payload?: any) => {
    if (workspace.mode === 'demo') return { signal: demo.signals?.[0], change: demo.changes[0] }
    return liveFetch('/api/vendor-changes/signals/ingest', { method: 'POST', body: JSON.stringify(payload ?? { vendor: 'MICROSOFT', sourceType: 'MANUAL', sourceUrl: 'manual://vendor-signal', title: 'Manual vendor signal', rawText: 'Manual vendor signal for classification' }) })
  }, [workspace.mode, demo])

  const classifyChange = useCallback(async (id: string) => {
    if (workspace.mode === 'demo') return { change: demo.changes.find((change: any) => change.id === id) }
    return liveFetch(`/api/vendor-changes/${encodeURIComponent(id)}/classify`, { method: 'POST' })
  }, [workspace.mode, demo])

  const assessChange = useCallback(async (id: string) => {
    if (workspace.mode === 'demo') return { impact: demoImpacts[id] ?? demo.changes.find((change: any) => change.id === id) }
    return liveFetch(`/api/vendor-changes/${encodeURIComponent(id)}/assess`, { method: 'POST' })
  }, [workspace.mode, demo, demoImpacts])

  const promoteToOpportunity = useCallback(async (id: string) => {
    if (workspace.mode === 'demo') return { opportunities: demoOpportunityPipeline[id]?.opportunities ?? [{ opportunityId: `demo-${id}`, recommendationSource: 'VENDOR_CHANGE', title: `${id} opportunity` }] }
    return liveFetch(`/api/vendor-changes/${encodeURIComponent(id)}/promote-to-opportunity`, { method: 'POST' })
  }, [workspace.mode, demoOpportunityPipeline])

  const generateOpportunities = promoteToOpportunity

  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.changes.length === 0), refresh, ingestSignal, classifyChange, assessChange, promoteToOpportunity, generateOpportunities }
}
