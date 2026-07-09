import { useMemo } from 'react'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyConnectorOps, normalizeConnectorOps } from '../lib/liveNormalizers'
import { useWorkspace } from '../lib/workspaceContext'
import { useLiveResource } from './useLiveResource'

export type ConnectorOpsDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useConnectorOpsData(): any {
  const workspace = useWorkspace()
  const demo = useDemoRuntimeStore()
  const live = useLiveResource({ path: '/api/runtime/connectors', enabled: workspace.mode === 'live', initialData: emptyConnectorOps, normalizer: normalizeConnectorOps, isEmpty: (data) => data.connectors.length === 0 })
  return useMemo(() => {
    if (workspace.mode === 'demo') return { loading: false, error: null, refresh: () => Promise.resolve(demo.connectorOps), isEmptyLive: false, dataState: 'DEMO' as ConnectorOpsDataState, data: demo.connectorOps }
    if (!workspace.dataReady) return { loading: false, error: null, refresh: live.refresh, isEmptyLive: true, dataState: 'NOT_CONNECTED' as ConnectorOpsDataState, data: emptyConnectorOps }
    const dataState: ConnectorOpsDataState = live.error ? 'NO_DATA' : live.isEmpty ? 'NO_DATA' : 'LIVE'
    return { loading: live.loading, error: live.error, refresh: live.refresh, isEmptyLive: live.isEmpty, dataState, data: live.data }
  }, [workspace, demo, live.loading, live.error, live.refresh, live.isEmpty, live.data])
}
