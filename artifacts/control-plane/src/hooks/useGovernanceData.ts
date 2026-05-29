import { useCallback } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { normalizeGovernanceRows } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useGovernanceData(): any{
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 const normalizeLive = useCallback((payload: unknown) => {
  const source = Array.isArray(payload) ? payload as any[] : [payload]
  return [...normalizeGovernanceRows(source[0] ?? [], w.tenantId), ...normalizeGovernanceRows(source[1] ?? [], w.tenantId)]
 }, [w.tenantId])
 const live=useLiveResource({ path: ['/api/governance/evaluations','/api/events'], enabled: w.mode === 'live', initialData: [], normalizer: normalizeLive, isEmpty: (data) => data.length === 0 })
 if(w.mode==='demo') return { isEmptyLive:false, data:demo.governanceAuditLog, loading:false, error:null, refresh: () => Promise.resolve(demo.governanceAuditLog) }
 return { isEmptyLive:!w.dataReady || live.isEmpty, data: live.data, loading: live.loading, error: live.error, refresh: live.refresh }
}
