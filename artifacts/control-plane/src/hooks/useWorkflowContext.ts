import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type WorkflowContextWorkflow = {
  id: string
  name: string
  workflowType: string
  sourceSystem: string
  sourceReference: string
}

export type WorkflowContextEvaluation = {
  verdict: string
  confidence: number
  verifiedValue: number
  protectedValue: number
  investmentCount: number
  decisionCount: number
  outcomeCount: number
}

export type WorkflowContextData = {
  workflow: WorkflowContextWorkflow | null
  evaluation: WorkflowContextEvaluation | null
  linkedInvestmentIds: string[]
  linkedDecisionIds: string[]
  linkedOutcomeIds: string[]
  dataState: DataState
  error?: string
}

export function demoWorkflowContext(sourceSystem: string, sourceReference: string): Omit<WorkflowContextData, 'dataState' | 'error'> {
  return {
    workflow: { id: 'demo-workflow', name: 'M365 License Reclamation', workflowType: 'BUSINESS', sourceSystem, sourceReference },
    evaluation: { verdict: 'VALUE_PRODUCING', confidence: 0.85, verifiedValue: 14400, protectedValue: 9600, investmentCount: 1, decisionCount: 1, outcomeCount: 1 },
    linkedInvestmentIds: ['demo-investment'],
    linkedDecisionIds: ['demo-decision'],
    linkedOutcomeIds: ['demo-outcome'],
  }
}

const emptyWorkflowContextData = (dataState: DataState, error?: string): WorkflowContextData => ({
  workflow: null, evaluation: null, linkedInvestmentIds: [], linkedDecisionIds: [], linkedOutcomeIds: [], dataState, error,
})

export function useWorkflowContext(sourceSystem?: string, sourceReference?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<WorkflowContextData>(emptyWorkflowContextData('DEMO'))
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!sourceSystem || !sourceReference) { setData(emptyWorkflowContextData('NO_DATA')); return }
    if (workspace.mode === 'demo') { setData({ ...demoWorkflowContext(sourceSystem, sourceReference), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData(emptyWorkflowContextData('NOT_CONNECTED')); return }
    setLoading(true)
    try {
      const workflows = await liveFetch<WorkflowContextWorkflow[]>(`/api/workflow-value-graph/workflows?sourceSystem=${encodeURIComponent(sourceSystem)}&sourceReference=${encodeURIComponent(sourceReference)}`)
      const workflow = workflows?.[0] ?? null
      if (!workflow) { setData(emptyWorkflowContextData('NO_DATA')); return }
      const lineage = await liveFetch<{ evaluation: WorkflowContextEvaluation; investments: Array<{ investmentId: string }>; decisions: Array<{ decisionId: string }>; outcomes: Array<{ outcomeId: string }> }>(`/api/workflow-value-graph/workflows/${workflow.id}/lineage`)
      setData({
        workflow,
        evaluation: lineage.evaluation,
        linkedInvestmentIds: lineage.investments.map((i) => i.investmentId),
        linkedDecisionIds: lineage.decisions.map((d) => d.decisionId),
        linkedOutcomeIds: lineage.outcomes.map((o) => o.outcomeId),
        dataState: 'LIVE',
      })
    } catch (error) {
      const err = normalizeApiError(error)
      setData(emptyWorkflowContextData('NO_DATA', err.message))
    } finally { setLoading(false) }
  }, [sourceSystem, sourceReference, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
