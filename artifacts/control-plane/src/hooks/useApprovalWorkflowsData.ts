import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { demoApprovals } from '../data/demo'

export function useApprovalWorkflowsData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoApprovals }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: { summary: { pending: 0, approvedToday: 0, escalated: 0, averageSlaHours: 0 }, pending: [], history: [] } }
    return { loading: false, isEmptyLive: false, data: { summary: { pending: 0, approvedToday: 0, escalated: 0, averageSlaHours: 0 }, pending: [], history: [] } }
  }, [workspace])
}
