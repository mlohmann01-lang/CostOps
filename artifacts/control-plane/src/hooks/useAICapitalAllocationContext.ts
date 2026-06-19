import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type AICapitalAllocationContextEvaluation = {
  initiativeId: string
  name: string
  allocationVerdict: string
  recommendedAction: string
  protectedValue: number
  valueToCostRatio: number
  allocationConfidence: number
}

export type AICapitalAllocationContextData = {
  allocation: AICapitalAllocationContextEvaluation | null
  dataState: DataState
  error?: string
}

export function demoAICapitalAllocationContext(): Omit<AICapitalAllocationContextData, 'dataState' | 'error'> {
  return {
    allocation: {
      initiativeId: 'demo-initiative', name: 'GitHub Copilot Adoption', allocationVerdict: 'INCREASE',
      recommendedAction: 'EXPAND', protectedValue: 3000, valueToCostRatio: 3.5, allocationConfidence: 0.8,
    },
  }
}

const empty = (dataState: DataState, error?: string): AICapitalAllocationContextData => ({ allocation: null, dataState, error })

export function useAICapitalAllocationContext(workflowId?: string, investmentId?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<AICapitalAllocationContextData>(empty('DEMO'))
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!workflowId && !investmentId) { setData(empty('NO_DATA')); return }
    if (workspace.mode === 'demo') { setData({ ...demoAICapitalAllocationContext(), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData(empty('NOT_CONNECTED')); return }
    setLoading(true)
    try {
      const query = workflowId ? `workflowId=${encodeURIComponent(workflowId)}` : `investmentId=${encodeURIComponent(investmentId!)}`
      const initiatives = await liveFetch<Array<{ id: string; name: string }>>(`/api/ai-initiative-portfolio/initiatives?${query}`)
      const initiative = initiatives?.[0]
      if (!initiative) { setData(empty('NO_DATA')); return }
      const allocation = await liveFetch<Omit<AICapitalAllocationContextEvaluation, 'name'>>(`/api/ai-capital-allocation/initiatives/${initiative.id}/allocation`)
      if (!allocation) { setData(empty('NO_DATA')); return }
      setData({ allocation: { ...allocation, name: initiative.name }, dataState: 'LIVE' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData(empty('NO_DATA', err.message))
    } finally { setLoading(false) }
  }, [workflowId, investmentId, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
