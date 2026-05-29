import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { normalizeRecommendations } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useRecommendationsData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: '/api/recommendations', enabled: workspace.mode === 'live', initialData: [], normalizer: normalizeRecommendations, isEmpty: (data) => data.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.recommendations), isEmptyLive: false, data: demo.recommendations }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
