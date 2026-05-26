import { useQuery } from '@tanstack/react-query'
import { useRuntimeContext } from '../lib/runtimeContext'
import { loadExecutionState } from '../lib/executionData'
import { RuntimeStateNotice } from '../components/RuntimeStateNotice'

export default function ExecutionView() {
  const runtime = useRuntimeContext()
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['execution', runtime.environment], queryFn: () => loadExecutionState(runtimeOptions) })
  if (!data) return <div style={{padding:20}}>Loading execution…</div>
  return <div style={{padding:20}}><h1>Execution</h1><RuntimeStateNotice dataSource={data.metadata.dataSource} environment={runtime.environment ?? 'DEMO'} emptyMessage='No execution records available.' demoMessage='Demo execution records are simulated.' liveMessage='No live execution records available yet.' error={data.metadata.error} />
    {runtime.isLive && <div style={{fontSize:12,marginBottom:8}}>Governed execution is disabled in this beta workspace. Dry-run and approval workflows remain available.</div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,margin:'10px 0'}}><div>Queued {data.summary.queued}</div><div>Dry-run ready {data.summary.dryRunReady}</div><div>Verified {data.summary.verified}</div><div>Rollback available {data.summary.rollbackAvailable}</div></div>
    {data.records.map((r)=><div key={r.id} style={{border:'0.5px solid var(--border-subtle)',padding:8,borderRadius:8,marginBottom:6}}>{r.title} · {r.status} · {r.environment} · rollback {r.rollbackStatus ?? 'unknown'}<div><button disabled>{runtime.isDemo ? 'Simulate execution' : 'Start execution'}</button></div></div>)}
  </div>
}
