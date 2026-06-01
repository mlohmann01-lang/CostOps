import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyApprovals, normalizeApprovalWorkflows } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useApprovalWorkflowsData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: '/api/approval-authority', enabled: workspace.mode === 'live', initialData: emptyApprovals, normalizer: normalizeApprovalWorkflows, isEmpty: (data) => data.pending.length === 0 && data.history.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.approvals), isEmptyLive: false, data: demo.approvals }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
