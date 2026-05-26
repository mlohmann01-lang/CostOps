import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRuntimeContext } from '../lib/runtimeContext'
import { loadConnectorHubState } from '../lib/connectorHubData'
import { RuntimeStateNotice } from '../components/RuntimeStateNotice'

export default function ConnectorHub() {
  const runtime = useRuntimeContext()
  const qc = useQueryClient()
  const [op, setOp] = useState<string>('')
  const runtimeOptions = { environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }
  const { data } = useQuery({ queryKey: ['connectors-hub', runtime.environment], queryFn: () => loadConnectorHubState(runtimeOptions) })
  if (!data) return <div style={{padding:20}}>Loading connectors…</div>

  async function run(path: string, label: string) {
    setOp(`${label}…`)
    try { const r = await fetch(path, { method: 'POST' }); const j = await r.json(); setOp(`${label}: ${j.status ?? 'completed'}`) } catch { setOp(`${label}: failed safely`) }
    await qc.invalidateQueries({ queryKey: ['connectors-hub', runtime.environment] })
  }

  return <div style={{padding:20}}><h1>Connector Hub</h1><RuntimeStateNotice dataSource={data.metadata.dataSource} environment={runtime.environment ?? 'DEMO'} emptyMessage='No connector records available.' demoMessage='Demo workspace uses synthetic connector states. Production connectors cannot be modified here.' liveMessage='No live connectors configured yet. Start with Microsoft 365 read-only setup.' error={data.metadata.error} />
    {runtime.isLive && data.m365 && <div style={{border:'0.5px solid var(--border-subtle)',borderRadius:8,padding:10,margin:'10px 0'}}><strong>Microsoft 365 Readiness</strong><div>Status: {data.m365.readinessStatus} · Sync: {data.m365.syncStatus}</div><div>{data.m365.readinessStatus==='NOT_CONFIGURED'?'Start Microsoft 365 read-only setup.':data.m365.readinessStatus==='READY'?'Ready for read-only sync.':data.m365.readinessStatus==='DEGRADED'?'Partial data warning.':'Connector blocked. Review readiness checks.'}</div><div style={{marginTop:6,display:'flex',gap:6}}><button disabled={!data.m365.canSmokeTest} onClick={()=>run('/api/connectors/m365/smoke-test','Smoke test')}>Run smoke test</button><button disabled={!data.m365.canSync} onClick={()=>run('/api/connectors/m365/sync/read-only','Read-only sync')}>Run read-only sync</button><button disabled={!data.m365.canSync} onClick={()=>run('/api/connectors/m365/recommendations/generate','Generate recommendations')}>Generate recommendations</button></div>{op && <div style={{fontSize:12,marginTop:6}}>{op}</div>}{data.m365.checks.map((c)=> <div key={c.id} style={{fontSize:12}}>{c.id}: {c.status} — {c.detail}</div>)}</div>}
    {data.connectors.map((c)=><div key={c.id} style={{border:'0.5px solid var(--border-subtle)',padding:8,borderRadius:8,marginBottom:6}}>{c.name} · {c.mode} · {c.health} · {c.capability}</div>)}
  </div>
}
