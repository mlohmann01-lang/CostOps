import { useState } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { ConnectorCard } from '../components/connectors/ConnectorCard'
import { EvidenceSourceTable } from '../components/connectors/EvidenceSourceTable'
import { AlertBar } from '../components/shared/AlertBar'
import { CONNECTORS } from '../lib/mockData'
import type { ConnectorConfig } from '../types/connector'

export default function ConnectorHub() {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>(CONNECTORS)
  const [selectedId, setSelectedId] = useState<string>('openai')
  const [banner, setBanner] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const degraded = connectors.filter(c => c.readiness === 'DEGRADED' || c.readiness === 'UNAVAILABLE')
  const selected = connectors.find(c => c.id === selectedId) ?? connectors[0]

  function testAll() {
    const next = connectors.map(c => ({ ...c, readiness: (c.readiness === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'READY') as ConnectorConfig['readiness'] }))
    setConnectors(next)
    const readyCnt = next.filter(c => c.readiness === 'READY').length
    const degradedCnt = next.filter(c => c.readiness === 'DEGRADED').length
    const unavailCnt = next.filter(c => c.readiness === 'UNAVAILABLE').length
    setBanner(`${readyCnt} ready · ${degradedCnt} degraded · ${unavailCnt} unavailable`)
  }

  return <Shell><div style={{ padding: '16px 20px 0', borderBottom: '0.5px solid var(--border-subtle)', background: 'var(--surface-0)', flexShrink: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}><h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Connector hub</h1>
      <div style={{ display: 'flex', gap: 8 }}><button onClick={testAll}><RefreshCw size={12} /> Test all</button><button onClick={()=>setShowAdd(true)}><Plus size={12} /> Add connector</button></div></div>
    <DomainTabs connectors={connectors} currentDomain="all" basePath="/connectors" /></div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>{banner && <div>{banner}</div>}
      {degraded.map(c => <AlertBar key={c.id} connectorName={c.name} reason='credential refresh failed' onReconfigure={() => setBanner(`${c.name}: configuration required before readiness can recover`)} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>{connectors.map(c => <ConnectorCard key={c.id} connector={c} selected={selectedId === c.id} onSelect={setSelectedId} onToggle={(id)=>setConnectors(prev=>prev.map(x=>x.id===id?{...x,enabled:!x.enabled}:x))} />)}</div>
      <button onClick={()=>setShowSources(true)}>Manage sources</button>
      <EvidenceSourceTable sources={selected?.evidenceSources ?? []} connectorName={selected?.name ?? ''} />
    </div>
    {showAdd && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.2)'}} onClick={()=>setShowAdd(false)}><div style={{background:'white',padding:16,margin:'10% auto',width:420}} onClick={e=>e.stopPropagation()}><h3>Add connector</h3><p>OpenAI, M365/Entra, AWS, Azure, Snowflake, ServiceNow ITAM, Flexera.</p><p>ServiceNow/Flexera not configured yet; setup intent captured.</p></div></div>}
    {showSources && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.2)'}} onClick={()=>setShowSources(false)}><div style={{background:'white',padding:16,margin:'10% auto',width:420}} onClick={e=>e.stopPropagation()}><h3>Evidence sources</h3><p>Read-only in this version unless backend source update endpoint is enabled.</p></div></div>}
    <CommandBar /></Shell>
}
