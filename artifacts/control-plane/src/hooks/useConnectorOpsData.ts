import { useMemo } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyConnectorOps, normalizeConnectorOps } from '../lib/liveNormalizers'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export function useConnectorOpsData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: '/api/runtime/connectors', enabled: workspace.mode === 'live', initialData: emptyConnectorOps, normalizer: normalizeConnectorOps, isEmpty: (data) => data.connectors.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.connectorOps), isEmptyLive: false, data: demo.connectorOps }
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: !workspace.dataReady || live.isEmpty, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
