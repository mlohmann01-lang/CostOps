import { useMemo } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyRuntimeHealth, normalizeRuntimeHealth } from '../lib/liveNormalizers'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export function useRuntimeHealthData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: ['/api/runtime/health','/api/runtime/status','/api/runtime/connectors','/api/runtime/metrics','/api/execution-requests'], enabled: workspace.mode === 'live', initialData: emptyRuntimeHealth, normalizer: normalizeRuntimeHealth, isEmpty: (data) => data.components.length === 0 && data.activeIssues.length === 0 && !data.overallScore })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.runtimeHealth), isEmptyLive: false, data: demo.runtimeHealth }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
