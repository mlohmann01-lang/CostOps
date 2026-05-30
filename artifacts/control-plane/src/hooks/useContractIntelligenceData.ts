import { useCallback, useEffect, useMemo, useState } from 'react'
import { demoContractIntelligence } from '../data/demo'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export const contractApiPaths = ['/api/contracts', '/api/contracts/high-risk', '/api/contracts/opportunities']
const empty = { summary: { contracts: 0, atRisk: 0, unusedValue: 0, generatedOpportunities: 0 }, contracts: [], highRisk: [], opportunities: [] }

export function useContractIntelligenceData() {
  const workspace = useWorkspace()
  const demo = useMemo(() => ({ ...demoContractIntelligence, highRisk: demoContractIntelligence.contracts.filter((contract: any) => contract.riskLevel === 'HIGH') }), [])
  const [data, setData] = useState<any>(empty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') return demo
    if (!workspace.dataReady) { setData(empty); setError(null); return null }
    setLoading(true)
    try {
      const [all, high, opportunities] = await Promise.all([liveFetch<any>('/api/contracts'), liveFetch<any>('/api/contracts/high-risk'), liveFetch<any>('/api/contracts/opportunities')])
      const next = { summary: all.summary ?? empty.summary, contracts: all.contracts ?? [], highRisk: high.contracts ?? [], opportunities: opportunities.opportunities ?? [] }
      setData(next); setError(null); return next
    } catch (err) { setData(empty); setError(normalizeApiError(err)); return null }
    finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady, demo])

  useEffect(() => { void refresh() }, [refresh])
  return { data: workspace.mode === 'demo' ? demo : data, loading, error, isEmptyLive: workspace.mode === 'live' && (!workspace.dataReady || data.contracts.length === 0), refresh }
}
