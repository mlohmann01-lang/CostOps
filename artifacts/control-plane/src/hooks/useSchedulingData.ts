import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { demoSchedule } from '../data/demo'

export function useSchedulingData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoSchedule }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: { summary: { upcoming: 0, completed: 0, blocked: 0, projectedSavings: 0 }, upcoming: [], past: [] } }
    return { loading: false, isEmptyLive: false, data: { summary: { upcoming: 0, completed: 0, blocked: 0, projectedSavings: 0 }, upcoming: [], past: [] } }
  }, [workspace])
}
