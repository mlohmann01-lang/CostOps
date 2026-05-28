import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { demoRecommendations } from '../data/demo'

export function useRecommendationsData() {
  const workspace = useWorkspace()
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, isEmptyLive: false, data: demoRecommendations }
    if (!workspace.dataReady) return { loading: false, isEmptyLive: true, data: [] }
    return { loading: false, isEmptyLive: false, data: [] }
  }, [workspace])
}
