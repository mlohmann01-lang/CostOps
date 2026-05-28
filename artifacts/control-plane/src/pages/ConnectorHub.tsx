import React from 'react'
import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, StatusPill } from '../components/shared/Foundation'
import { useConnectorHubData } from '../hooks/useConnectorHubData'

export default function ConnectorHub() {
  const { data, isEmptyLive } = useConnectorHubData(); const [selected, setSelected] = useState<string | null>(null)
  if (isEmptyLive) return <Shell><EmptyState title='No connectors configured' description='Add your first connector to start ingesting data' ctaLabel='Add connector' /></Shell>
  const active = data.find((x:any)=>x.id===selected)
  return <Shell><div style={{padding:20}}><h1>Connector hub</h1><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{data.map((c:any)=><div key={c.id} onClick={()=>setSelected(c.id)}><b>{c.name}</b><div>{c.desc}</div><StatusPill status={c.health==='HEALTHY'?'ready':c.health==='DEGRADED'?'degraded':'unavailable'} /><div>Synced {c.synced}</div>{c.health==='UNAVAILABLE'&&<button>Configure connector →</button>}</div>)}<div><b>Add connector</b><div>Flexera, Datadog, GCP, and more</div></div></div>{active&&<div><h3>Evidence sources</h3><div>OpenAI Usage API v2 · 99% trust · Active</div><div>Billing export · 96% trust · Active</div></div>}</div></Shell>
}
