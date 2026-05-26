import { useQuery } from '@tanstack/react-query'
import { loadOutcomeLedgerState } from '../lib/outcomeLedgerData'
import { useRuntimeContext } from '../lib/runtimeContext'
import { RuntimeStateNotice } from '../components/RuntimeStateNotice'

export default function OutcomeLedgerView() {
  const runtime = useRuntimeContext()
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['outcomes', runtime.environment], queryFn: () => loadOutcomeLedgerState(runtimeOptions) })
  if (!data) return <div style={{padding:20}}>Loading outcomes…</div>
  return <div style={{padding:20}}><h1>Outcome Ledger</h1><RuntimeStateNotice dataSource={data.metadata.dataSource} environment={runtime.environment ?? 'DEMO'} emptyMessage='No outcomes recorded.' liveMessage='No live outcomes recorded yet.' demoMessage='Synthetic ledger entries only.' error={data.metadata.error} />
  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,margin:'10px 0'}}><div>Projected Monthly {data.summary.projectedMonthlySavings}</div><div>Verified Monthly {data.summary.verifiedMonthlySavings}</div><div>Verification Pending {data.summary.verificationPending}</div></div>
  {data.outcomes.map((o)=><div key={o.id} style={{border:'0.5px solid var(--border-subtle)',borderRadius:8,padding:8,marginBottom:6}}>{o.title} · {o.status} · {o.environment} · projected {o.projectedMonthlySavings ?? 0} · verified {o.verifiedMonthlySavings ?? 0}</div>)}
  </div>
}
