import { useMemo } from 'react'
import { demoRuntimeHealth } from '../data/demo'
import { useWorkspace } from '../lib/workspaceContext'

const emptyRuntimeHealth = {
  overallScore: 0,
  summary: '',
  components: [],
  activeIssues: [],
  recentEvents: [],
}

export function useRuntimeHealthData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoRuntimeHealth }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: emptyRuntimeHealth }
    return { loading: false, isEmptyLive: false, data: emptyRuntimeHealth }
  }, [workspace])
}
