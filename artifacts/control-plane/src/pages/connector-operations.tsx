import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, MetricCard, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useConnectorOpsData } from '../hooks/useConnectorOpsData'

type PillStatus = Parameters<typeof StatusPill>[0]['status']
const pill = (status: string): PillStatus => status === 'degraded' ? 'degraded' : status === 'blocked' ? 'blocked' : 'ready'

export default function ConnectorOperationsPage() {
  const { data, isEmptyLive } = useConnectorOpsData()
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  if (isEmptyLive) return <Shell><EmptyState title='No connector operations yet' description='Connector Ops will appear once live connectors begin syncing.' /></Shell>
  const selectedConnector = data.connectors.find((connector) => connector.id === selected)

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform administration</SectionLabel><h1>Connector Ops</h1><p style={{ color: 'var(--text-secondary)' }}>Connector sync freshness, trust, and failed job handling.</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}><MetricCard label='Configured' value={String(data.summary.configured)} /><MetricCard label='Healthy' value={String(data.summary.healthy)} /><MetricCard label='Degraded' value={String(data.summary.degraded)} /><MetricCard label='Failed jobs' value={String(data.summary.failedJobs)} /></div>
    {notice && <div role='status' style={{ border: 'var(--border-teal)', borderRadius: 8, padding: 10, color: 'var(--teal)' }}>{notice}</div>}
    <section style={{ border: 'var(--border-default)', borderRadius: 10, overflow: 'hidden' }} data-testid='connector-sync-table'>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr .8fr .6fr 1fr 1fr 1.2fr', padding: 10, color: 'var(--text-label)', fontSize: 11, textTransform: 'uppercase' }}><span>Connector</span><span>Status</span><span>Freshness</span><span>Trust</span><span>Last sync</span><span>Failed job</span><span>Actions</span></div>
      {data.connectors.map((connector) => <div key={connector.id} role='button' tabIndex={0} data-testid={`connector-card-${connector.id}`} onClick={() => setSelected(connector.id)} onKeyDown={(event) => { if (event.key === 'Enter') setSelected(connector.id) }} style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr .8fr .6fr 1fr 1fr 1.2fr', width: '100%', padding: 10, textAlign: 'left', borderTop: 'var(--border-subtle)', background: selected === connector.id ? 'var(--teal-bg)' : 'transparent', color: 'inherit', cursor: 'pointer' }}>
        <strong>{connector.name}</strong><span><StatusPill status={pill(connector.status)} /></span><span>{connector.freshness}</span><span>{connector.trust}%</span><span>{connector.lastSync}</span><span>{connector.failedJob}</span><span><button onClick={(event) => { event.stopPropagation(); setNotice(`Retry placeholder queued for ${connector.name}`) }}>Retry</button> <button onClick={(event) => { event.stopPropagation(); setNotice(`Configure placeholder opened for ${connector.name}`) }}>Configure</button></span>
      </div>)}
    </section>
    {selectedConnector && <aside style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Selected connector</SectionLabel><h2>{selectedConnector.name}</h2><p>{selectedConnector.nextRun}</p></aside>}
  </div></Shell>
}
