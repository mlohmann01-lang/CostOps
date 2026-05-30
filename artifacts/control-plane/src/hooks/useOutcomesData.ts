import { useWorkspace } from '../lib/workspaceContext'
import { useDemoRuntimeStore } from '../lib/demoRuntimeStore'
import { emptyOutcomes, normalizeOutcomes } from '../lib/liveNormalizers'
import { useLiveResource } from './useLiveResource'

export function useOutcomesData(): any{
 const w=useWorkspace();
 const demo=useDemoRuntimeStore();
 const live=useLiveResource({ path: ['/api/outcomes/ledger','/api/outcomes/ledger/summary','/api/outcomes/unverified'], enabled: w.mode === 'live', initialData: emptyOutcomes, normalizer: normalizeOutcomes, isEmpty: (data) => data.ledger.length === 0 && data.stats.length === 0 })
 if(w.mode==='demo') return { isEmptyLive:false, data:{...demo.outcomes, unverified: (demo.outcomes as any).unverified ?? { count: demo.outcomes.stats[3] ?? 0, verificationFailures: demo.outcomes.stats[4] ?? 0, projectedValuePendingProof: demo.outcomes.ledger.filter((item:any)=>String(item.verificationStatus ?? item.state).toUpperCase() !== 'VERIFIED').reduce((sum:number,item:any)=>sum+Number(item.projected ?? 0),0) }}, loading:false, error:null, refresh: () => Promise.resolve(demo.outcomes) }
 return { isEmptyLive:!w.dataReady || live.isEmpty, data: live.data, loading: live.loading, error: live.error, refresh: live.refresh }
}
