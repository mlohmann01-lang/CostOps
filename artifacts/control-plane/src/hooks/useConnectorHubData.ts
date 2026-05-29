import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { normalizeConnectorOps } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

function normalizeConnectorHub(payload: unknown) {
 const ops = normalizeConnectorOps(payload)
 return ops.connectors.map((connector:any) => ({ id: connector.id, name: connector.name, health: connector.status === 'ready' ? 'HEALTHY' : connector.status === 'degraded' ? 'DEGRADED' : 'UNAVAILABLE', synced: connector.lastSync, desc: connector.failedJob === 'None' ? 'Live connector data' : connector.failedJob }))
}

export function useConnectorHubData(): any{
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 const live=useLiveResource({ path: '/api/runtime/connectors', enabled: w.mode === 'live', initialData: [], normalizer: normalizeConnectorHub, isEmpty: (data) => data.length === 0 })
 if(w.mode==='demo') return { isEmptyLive:false, data:demo.connectors, loading:false, error:null, refresh: () => Promise.resolve(demo.connectors) }
 return { isEmptyLive:!w.dataReady || live.isEmpty, data: live.data, loading: live.loading, error: live.error, refresh: live.refresh }
}
