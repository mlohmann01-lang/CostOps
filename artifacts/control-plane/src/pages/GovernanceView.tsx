import { useQuery } from '@tanstack/react-query'
import { useRuntimeContext } from '../lib/runtimeContext'
import { loadGovernanceState } from '../lib/governanceData'
import { RuntimeStateNotice } from '../components/RuntimeStateNotice'

export default function GovernanceView() {
  const runtime = useRuntimeContext()
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['governance', runtime.environment], queryFn: () => loadGovernanceState(runtimeOptions) })
  if (!data) return <div style={{padding:20}}>Loading governance…</div>
  return <div style={{padding:20}}><h1>Governance</h1><RuntimeStateNotice dataSource={data.metadata.dataSource} environment={runtime.environment ?? 'DEMO'} emptyMessage='No approvals or policy blockers found.' demoMessage='Synthetic approvals and policy gates.' liveMessage='No live approvals queued yet.' error={data.metadata.error} />
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,margin:'10px 0'}}><div>Approvals Required {data.summary.approvalsRequired}</div><div>Blocked {data.summary.blockedActions}</div><div>Warnings {data.summary.policyWarnings}</div><div>Avg Trust {data.summary.averageTrustScore ?? 'n/a'}</div></div>
    <h3>Approval Queue</h3>{data.approvalQueue.map((a)=><div key={a.id} style={{border:'0.5px solid var(--border-subtle)',padding:8,borderRadius:8,marginBottom:6}}>{a.title} · {a.approvalState} · {a.reason}<div><button disabled>{runtime.isDemo ? 'Simulated approval flow' : 'Approval action endpoint not enabled in this beta build.'}</button></div></div>)}
    <h3>Blocked Actions</h3>{data.blockedActions.map((b)=><div key={b.id} style={{border:'0.5px solid var(--border-subtle)',padding:8,borderRadius:8,marginBottom:6}}>{b.title} · {b.blocker} · {b.remediationStep}</div>)}
  </div>
}
