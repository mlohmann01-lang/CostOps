import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type ValueRealisationInvestment = {
  id: string
  name: string
  investmentType: string
  status: string
  sourceSystem: string
  sourceReference: string
  expectedValueAmount?: number
}

export type ValueRealisationEvaluation = {
  verdict: string
  confidence: number
  totalProjectedValue: number
  totalExecutedValue: number
  totalVerifiedValue: number
  totalProtectedValue: number
  evidenceCount: number
}

export type ValueRealisationContextData = {
  investment: ValueRealisationInvestment | null
  evaluation: ValueRealisationEvaluation | null
  dataState: DataState
  error?: string
}

export function demoValueRealisationContext(sourceSystem: string, sourceReference: string): { investment: ValueRealisationInvestment; evaluation: ValueRealisationEvaluation } {
  return {
    investment: {
      id: 'demo-investment', name: 'GitHub Copilot', investmentType: 'AI', status: 'EXECUTED',
      sourceSystem, sourceReference, expectedValueAmount: 1000,
    },
    evaluation: { verdict: 'VALUE_CONFIRMED', confidence: 0.9, totalProjectedValue: 1000, totalExecutedValue: 1000, totalVerifiedValue: 1200, totalProtectedValue: 0, evidenceCount: 1 },
  }
}

export function useValueRealisationContext(sourceSystem?: string, sourceReference?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<ValueRealisationContextData>({ investment: null, evaluation: null, dataState: 'DEMO' })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!sourceSystem || !sourceReference) { setData({ investment: null, evaluation: null, dataState: 'NO_DATA' }); return }
    if (workspace.mode === 'demo') { const demo = demoValueRealisationContext(sourceSystem, sourceReference); setData({ ...demo, dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData({ investment: null, evaluation: null, dataState: 'NOT_CONNECTED' }); return }
    setLoading(true)
    try {
      const investments = await liveFetch<ValueRealisationInvestment[]>(`/api/value-realisation/investments?sourceSystem=${encodeURIComponent(sourceSystem)}&sourceReference=${encodeURIComponent(sourceReference)}`)
      const investment = investments?.[0] ?? null
      if (!investment) { setData({ investment: null, evaluation: null, dataState: 'NO_DATA' }); return }
      const summary = await liveFetch<{ investment: ValueRealisationInvestment; evaluation: ValueRealisationEvaluation }>(`/api/value-realisation/investments/${investment.id}/summary`)
      setData({ investment: summary.investment, evaluation: summary.evaluation, dataState: 'LIVE' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData({ investment: null, evaluation: null, dataState: 'NO_DATA', error: err.message })
    } finally { setLoading(false) }
  }, [sourceSystem, sourceReference, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
