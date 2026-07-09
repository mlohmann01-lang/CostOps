import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type AIValueAttributionContextActivity = {
  id: string
  activityName: string
  activityType: string
  provider?: string
  model?: string
  agent?: string
  sourceSystem: string
  sourceReference: string
}

export type AIValueAttributionContextEvaluation = {
  verdict: string
  confidence: number
  totalAttributedValue: number
  directEvidenceValue: number
  workflowEvidenceValue: number
  outcomeEvidenceValue: number
}

export type AIValueAttributionContextData = {
  activity: AIValueAttributionContextActivity | null
  evaluation: AIValueAttributionContextEvaluation | null
  linkedWorkflowIds: string[]
  evidenceCount: number
  dataState: DataState
  error?: string
}

export function demoAIValueAttributionContext(sourceSystem: string, sourceReference: string): Omit<AIValueAttributionContextData, 'dataState' | 'error'> {
  return {
    activity: { id: 'demo-ai-activity', activityName: 'GitHub Copilot', activityType: 'CODING', provider: 'GitHub', sourceSystem, sourceReference },
    evaluation: { verdict: 'ATTRIBUTED', confidence: 0.85, totalAttributedValue: 4200, directEvidenceValue: 1200, workflowEvidenceValue: 3000, outcomeEvidenceValue: 0 },
    linkedWorkflowIds: ['demo-workflow'],
    evidenceCount: 2,
  }
}

const emptyAIValueAttributionContextData = (dataState: DataState, error?: string): AIValueAttributionContextData => ({
  activity: null, evaluation: null, linkedWorkflowIds: [], evidenceCount: 0, dataState, error,
})

export function useAIValueAttributionContext(sourceSystem?: string, sourceReference?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<AIValueAttributionContextData>(emptyAIValueAttributionContextData('DEMO'))
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!sourceSystem || !sourceReference) { setData(emptyAIValueAttributionContextData('NO_DATA')); return }
    if (workspace.mode === 'demo') { setData({ ...demoAIValueAttributionContext(sourceSystem, sourceReference), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData(emptyAIValueAttributionContextData('NOT_CONNECTED')); return }
    setLoading(true)
    try {
      const activities = await liveFetch<AIValueAttributionContextActivity[]>(`/api/ai-value-attribution/activities?sourceSystem=${encodeURIComponent(sourceSystem)}&sourceReference=${encodeURIComponent(sourceReference)}`)
      const activity = activities?.[0] ?? null
      if (!activity) { setData(emptyAIValueAttributionContextData('NO_DATA')); return }
      const attributions = await liveFetch<Array<{ workflowId?: string; evidenceItemId?: string }>>(`/api/ai-value-attribution/attributions?activityId=${activity.id}`)
      const evaluation = await liveFetch<AIValueAttributionContextEvaluation>(`/api/ai-value-attribution/activities/${activity.id}/evaluation`).catch(() => null)
      setData({
        activity,
        evaluation,
        linkedWorkflowIds: [...new Set((attributions ?? []).map((a) => a.workflowId).filter((w): w is string => Boolean(w)))],
        evidenceCount: (attributions ?? []).filter((a) => a.evidenceItemId).length,
        dataState: 'LIVE',
      })
    } catch (error) {
      const err = normalizeApiError(error)
      setData(emptyAIValueAttributionContextData('NO_DATA', err.message))
    } finally { setLoading(false) }
  }, [sourceSystem, sourceReference, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
