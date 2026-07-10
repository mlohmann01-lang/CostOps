import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyExecution, normalizeExecution } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export type ExecutionDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export function useExecutionData(): any{
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 const live=useLiveResource({ path: '/api/execution-requests', enabled: w.mode === 'live', initialData: emptyExecution, normalizer: normalizeExecution, isEmpty: (data) => data.awaiting.length === 0 && data.completed.length === 0 })
 if(w.mode==='demo') return { isEmptyLive:false, data:demo.execution, executingIds: demo.executingIds, rollbackNotices: demo.rollbackNotices, loading:false, error:null, dataState: 'DEMO' as ExecutionDataState, refresh: () => Promise.resolve(demo.execution) }
 if(!w.dataReady) return { isEmptyLive:true, data: emptyExecution, executingIds: {}, rollbackNotices: {}, loading:false, error:null, dataState: 'NOT_CONNECTED' as ExecutionDataState, refresh: live.refresh }
 const dataState: ExecutionDataState = live.error ? 'NO_DATA' : live.isEmpty ? 'NO_DATA' : 'LIVE'
 return { isEmptyLive: live.isEmpty, data: live.data, executingIds: {}, rollbackNotices: {}, loading: live.loading, error: live.error, dataState, refresh: live.refresh }
}
