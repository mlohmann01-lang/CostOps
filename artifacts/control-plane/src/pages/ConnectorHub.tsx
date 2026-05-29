import React from 'react'
import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, StatusPill, LiveDataError } from '../components/shared/Foundation'
import { useConnectorHubData } from '../hooks/useConnectorHubData'
import { simulateConnectorRetry } from '../lib/demoRuntimeStore'
import { liveFetch } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export async function generateM365LiveRecommendations() {
  return liveFetch('/api/playbooks/m365/generate-recommendations', { method: 'POST', headers: { 'content-type': 'application/json' } })
}

export default function ConnectorHub() {
  const workspace = useWorkspace(); const { data, isEmptyLive, error, refresh } = useConnectorHubData(); const [selected, setSelected] = useState<string | null>(null); const [notice, setNotice] = useState(''); const [generating, setGenerating] = useState(false)
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  if (isEmptyLive) return <Shell><EmptyState title='No connectors configured' description='Add your first connector to start ingesting data' ctaLabel='Add connector' /></Shell>
  const active = data.find((x:any)=>x.id===selected)
  const runM365Generation = async (event: React.MouseEvent, connector: any) => {
    event.stopPropagation()
    if (workspace.mode === 'demo') { simulateConnectorRetry(connector.id); return }
    setGenerating(true)
    setNotice('Running M365 governance evaluation…')
    try {
      const result: any = await generateM365LiveRecommendations()
      setNotice(result?.scannedUsers === 0 ? 'M365 connected but no usage/licence data has been ingested yet' : 'M365 governance evaluation complete')
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('certen:live-read-refresh'))
      void refresh()
    } catch (err) {
      setNotice(`Live data unavailable: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setGenerating(false) }
  }
  return <Shell><div style={{padding:20}}><h1>Connector hub</h1>{notice && <div role='status' style={{border:'var(--border-default)',padding:10,margin:'10px 0'}}>{notice}</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{data.map((c:any)=><div key={c.id} onClick={()=>setSelected(c.id)}><b>{c.name}</b><div>{c.desc}</div><StatusPill status={c.health==='HEALTHY'?'ready':c.health==='DEGRADED'?'degraded':c.health==='TESTING'?'testing':'unavailable'} /><div>Synced {c.synced}</div>{workspace.mode === 'live' && c.id === 'm365' && <button disabled={generating} onClick={(event)=>runM365Generation(event,c)}>{generating ? 'Generating…' : 'Run governance evaluation'}</button>}<button onClick={(event)=>{event.stopPropagation(); workspace.mode === 'demo' && simulateConnectorRetry(c.id)}}>{c.health==='UNAVAILABLE'?'Configure connector →':'Retry / Test'}</button>{workspace.mode === 'live' && c.id === 'm365' && c.synced === 'Never' && <div>M365 connected but no usage/licence data has been ingested yet</div>}</div>)}<div><b>Add connector</b><div>Flexera, Datadog, GCP, and more</div></div></div>{active&&<div><h3>Evidence sources</h3><div>OpenAI Usage API v2 · 99% trust · Active</div><div>Billing export · 96% trust · Active</div></div>}</div></Shell>
}
