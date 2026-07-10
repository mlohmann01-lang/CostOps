import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type AIEconomicsContextProfile = {
  id: string
  profileName: string
  investmentId?: string
  workflowId?: string
  totalSpend: number
  totalAttributedValue: number
  verifiedValue: number
  protectedValue: number
  valueToCostRatio: number
  economicConfidence: number
  verdict: string
}

export type AIEconomicsContextData = {
  profile: AIEconomicsContextProfile | null
  dataState: DataState
  error?: string
}

export function demoAIEconomicsContext(): Omit<AIEconomicsContextData, 'dataState' | 'error'> {
  return {
    profile: {
      id: 'demo-ai-economic-profile', profileName: 'GitHub Copilot', investmentId: 'demo-investment',
      totalSpend: 1200, totalAttributedValue: 4200, verifiedValue: 3600, protectedValue: 3000,
      valueToCostRatio: 3.5, economicConfidence: 0.8, verdict: 'EXPAND',
    },
  }
}

const emptyAIEconomicsContextData = (dataState: DataState, error?: string): AIEconomicsContextData => ({
  profile: null, dataState, error,
})

export function useAIEconomicsContext(investmentId?: string, workflowId?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<AIEconomicsContextData>(emptyAIEconomicsContextData('DEMO'))
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!investmentId && !workflowId) { setData(emptyAIEconomicsContextData('NO_DATA')); return }
    if (workspace.mode === 'demo') { setData({ ...demoAIEconomicsContext(), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData(emptyAIEconomicsContextData('NOT_CONNECTED')); return }
    setLoading(true)
    try {
      const result = investmentId
        ? await liveFetch<{ profiles: AIEconomicsContextProfile[] }>(`/api/ai-economics/investments/${investmentId}/economics`)
        : await liveFetch<{ profiles: AIEconomicsContextProfile[] }>(`/api/ai-economics/workflows/${workflowId}/economics`)
      const profile = result?.profiles?.[0] ?? null
      if (!profile) { setData(emptyAIEconomicsContextData('NO_DATA')); return }
      setData({ profile, dataState: 'LIVE' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData(emptyAIEconomicsContextData('NO_DATA', err.message))
    } finally { setLoading(false) }
  }, [investmentId, workflowId, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
