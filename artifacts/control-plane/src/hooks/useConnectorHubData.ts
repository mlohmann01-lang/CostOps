import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { useLiveResource } from './useLiveResource'

export const m365ConnectorProductionApiPaths = ['/api/connectors/m365/readiness', '/api/connectors/m365/health', '/api/connectors/m365/trust', '/api/connectors/m365/snapshots/latest', '/api/runtime/health']

function normalizeConnectorHub(payload: unknown) {
 const [readiness, health, trust, snapshot, runtime] = Array.isArray(payload) ? payload as any[] : []
 const playbookStats = (runtime?.components ?? []).find((component:any) => component.id === 'm365-playbook-engine')
 return [{
  id: 'm365', name: 'Microsoft 365', health: health?.state === 'HEALTHY' ? 'HEALTHY' : health?.state === 'PARTIAL' || health?.state === 'DEGRADED' ? 'DEGRADED' : 'UNAVAILABLE', synced: health?.lastSuccessfulSyncAt ?? snapshot?.snapshot?.capturedAt ?? 'Never', desc: `readiness ${readiness?.authState ?? readiness?.status ?? 'NOT_CONFIGURED'} · trust ${trust?.globalTrustBand ?? 'BLOCKED'}`,
  readiness, connectorHealth: health, trust, snapshot, playbookStats, readReady: Boolean(readiness?.readReady), writeReady: Boolean(readiness?.writeReady), blockers: [...(readiness?.blockers ?? []), ...(health?.blockers ?? [])], warnings: [...(readiness?.warnings ?? []), ...(health?.warnings ?? [])]
 }]
}

export function useConnectorHubData(): any{
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 const live=useLiveResource({ path: m365ConnectorProductionApiPaths, enabled: w.mode === 'live', initialData: [], normalizer: normalizeConnectorHub, isEmpty: (data) => data.length === 0 })
 if(w.mode==='demo') return { isEmptyLive:false, data:demo.connectors, loading:false, error:null, refresh: () => Promise.resolve(demo.connectors) }
 return { isEmptyLive:!w.dataReady || live.isEmpty, data: live.data, loading: live.loading, error: live.error, refresh: live.refresh }
}
