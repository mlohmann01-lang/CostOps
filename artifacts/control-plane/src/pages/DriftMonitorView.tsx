import { useQuery } from '@tanstack/react-query'
import { loadDriftMonitorState } from '../lib/driftMonitorData'
import { useRuntimeContext } from '../lib/runtimeContext'
import { RuntimeStateNotice } from '../components/RuntimeStateNotice'

export default function DriftMonitorView() {
  const runtime = useRuntimeContext()
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['drift', runtime.environment], queryFn: () => loadDriftMonitorState(runtimeOptions) })
  if (!data) return <div style={{padding:20}}>Loading drift…</div>
  return <div style={{padding:20}}><h1>Drift Monitor</h1><RuntimeStateNotice dataSource={data.metadata.dataSource} environment={runtime.environment ?? 'DEMO'} emptyMessage='No active drift events.' liveMessage='No active drift detected in this live workspace.' demoMessage='Synthetic drift scenarios only.' error={data.metadata.error} />
  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,margin:'10px 0'}}><div>Active {data.summary.activeDriftEvents}</div><div>Value at Risk {data.summary.valueAtRisk}</div><div>Monitored Outcomes {data.summary.monitoredOutcomes}</div></div>
  {data.events.map((e)=><div key={e.id} style={{border:'0.5px solid var(--border-subtle)',borderRadius:8,padding:8,marginBottom:6}}>{e.title} · {e.status} · {e.severity} · at risk {e.valueAtRisk ?? 0} · {e.recommendedAction}</div>)}
  </div>
}
