import { useMemo } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyRuntimeHealth, normalizeRuntimeHealth } from '../lib/liveNormalizers'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export type RuntimeHealthDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useRuntimeHealthData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: ['/api/runtime/health','/api/runtime/status','/api/runtime/connectors','/api/runtime/metrics','/api/execution-requests'], enabled: workspace.mode === 'live', initialData: emptyRuntimeHealth, normalizer: normalizeRuntimeHealth, isEmpty: (data) => data.components.length === 0 && data.activeIssues.length === 0 && !data.overallScore })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.runtimeHealth), isEmptyLive: false, dataState: 'DEMO' as RuntimeHealthDataState, data: demo.runtimeHealth }
    if (!workspace.dataReady) return { loading: false, error: null, refresh: live.refresh, isEmptyLive: true, dataState: 'NOT_CONNECTED' as RuntimeHealthDataState, data: emptyRuntimeHealth }
    const dataState: RuntimeHealthDataState = live.error ? 'NO_DATA' : live.isEmpty ? 'NO_DATA' : 'LIVE'
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: live.isEmpty, dataState, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
