import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type AIInitiativeContextEvaluation = {
  initiativeId: string
  name: string
  portfolioVerdict: string
  attributedValue: number
  protectedValue: number
  totalSpend: number
  valueToCostRatio: number
  confidence: number
}

export type AIInitiativeContextData = {
  initiative: AIInitiativeContextEvaluation | null
  dataState: DataState
  error?: string
}

export function demoAIInitiativeContext(): Omit<AIInitiativeContextData, 'dataState' | 'error'> {
  return {
    initiative: {
      initiativeId: 'demo-initiative', name: 'GitHub Copilot Adoption', portfolioVerdict: 'SCALE',
      attributedValue: 4200, protectedValue: 3000, totalSpend: 1200, valueToCostRatio: 3.5, confidence: 0.8,
    },
  }
}

const empty = (dataState: DataState, error?: string): AIInitiativeContextData => ({ initiative: null, dataState, error })

export function useAIInitiativeContext(workflowId?: string, investmentId?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<AIInitiativeContextData>(empty('DEMO'))
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!workflowId && !investmentId) { setData(empty('NO_DATA')); return }
    if (workspace.mode === 'demo') { setData({ ...demoAIInitiativeContext(), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData(empty('NOT_CONNECTED')); return }
    setLoading(true)
    try {
      const query = workflowId ? `workflowId=${encodeURIComponent(workflowId)}` : `investmentId=${encodeURIComponent(investmentId!)}`
      const initiatives = await liveFetch<Array<{ id: string; name: string }>>(`/api/ai-initiative-portfolio/initiatives?${query}`)
      const initiative = initiatives?.[0]
      if (!initiative) { setData(empty('NO_DATA')); return }
      const lineage = await liveFetch<{ evaluation: Omit<AIInitiativeContextEvaluation, 'name'> }>(`/api/ai-initiative-portfolio/initiatives/${initiative.id}/lineage`)
      if (!lineage?.evaluation) { setData(empty('NO_DATA')); return }
      setData({ initiative: { ...lineage.evaluation, name: initiative.name }, dataState: 'LIVE' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData(empty('NO_DATA', err.message))
    } finally { setLoading(false) }
  }, [workflowId, investmentId, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
