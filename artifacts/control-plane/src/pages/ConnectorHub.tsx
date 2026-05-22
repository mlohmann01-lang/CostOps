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

  const degraded = connectors.filter(c => c.readiness === 'DEGRADED' || c.readiness === 'UNAVAILABLE')
  const selected = connectors.find(c => c.id === selectedId) ?? connectors[0]
  const readyCnt = connectors.filter(c => c.readiness === 'READY').length
  const degradedCnt = connectors.filter(c => c.readiness === 'DEGRADED').length
  const unavailCnt = connectors.filter(c => c.readiness === 'UNAVAILABLE').length

  function handleToggle(id: string) {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c))
  }

  return (
    <Shell>
      {/* Top bar */}
      <div style={{
        padding: '16px 20px 0',
        borderBottom: '0.5px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Connector hub</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              fontSize: 11, padding: '5px 11px',
              border: '0.5px solid var(--border-medium)', borderRadius: 8,
              background: 'none', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'inherit',
            }}>
              <RefreshCw size={12} /> Test all
            </button>
            <button style={{
              fontSize: 11, padding: '5px 11px',
              border: '0.5px solid var(--c-teal-400)', borderRadius: 8,
              background: 'var(--c-teal-400)', color: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: 'inherit',
            }}>
              <Plus size={12} /> Add connector
            </button>
          </div>
        </div>
        <DomainTabs connectors={connectors} currentDomain="all" basePath="/connectors" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        {/* Alert bars */}
        {degraded.filter(c => c.readiness === 'DEGRADED').map(c => (
          <AlertBar
            key={c.id}
            connectorName={c.name}
            reason={`credential refresh failed ${c.lastSyncAt ? '3h ago' : 'recently'} — downstream spend data may be stale`}
            onReconfigure={() => {}}
          />
        ))}

        {/* Connector count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Active connectors
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {connectors.length} configured · {readyCnt} ready · {degradedCnt} degraded · {unavailCnt} unavailable
          </span>
        </div>

        {/* Connector grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }} role="list">
          {connectors.map(c => (
            <ConnectorCard
              key={c.id}
              connector={c}
              selected={selectedId === c.id}
              onSelect={setSelectedId}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Evidence sources */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Evidence sources — {selected?.name}
          </span>
          <button style={{
            fontSize: 10, padding: '3px 9px',
            border: '0.5px solid var(--border-medium)', borderRadius: 6,
            background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Manage sources
          </button>
        </div>
        <EvidenceSourceTable
          sources={selected?.evidenceSources ?? []}
          connectorName={selected?.name ?? ''}
        />
      </div>

      <CommandBar />
    </Shell>
  )
}
