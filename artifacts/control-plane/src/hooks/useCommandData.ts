import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { demoActions, demoCommandMetrics, demoPostureSignals, demoPriorityActions } from '../data/demo'

export function useCommandData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: { actions: demoActions, metrics: demoCommandMetrics, posture: demoPostureSignals, priority: demoPriorityActions } }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: { actions: [], metrics: { totalIdentified:0, eligibleNow:0, pendingApproval:0, blockedManual:0 }, posture: [], priority: [] } }
    return { loading: false, isEmptyLive: false, data: { actions: [], metrics: { totalIdentified:0, eligibleNow:0, pendingApproval:0, blockedManual:0 }, posture: [], priority: [] } }
  }, [workspace])
}
