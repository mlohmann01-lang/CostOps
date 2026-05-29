import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyExecution, normalizeExecution } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useExecutionData(): any{
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 const live=useLiveResource({ path: '/api/execution-requests', enabled: w.mode === 'live', initialData: emptyExecution, normalizer: normalizeExecution, isEmpty: (data) => data.awaiting.length === 0 && data.completed.length === 0 })
 if(w.mode==='demo') return { isEmptyLive:false, data:demo.execution, executingIds: demo.executingIds, rollbackNotices: demo.rollbackNotices, loading:false, error:null, refresh: () => Promise.resolve(demo.execution) }
 return { isEmptyLive:!w.dataReady || live.isEmpty, data: live.data, executingIds: {}, rollbackNotices: {}, loading: live.loading, error: live.error, refresh: live.refresh }
}
