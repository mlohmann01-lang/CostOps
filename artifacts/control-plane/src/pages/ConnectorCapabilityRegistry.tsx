import React from 'react'
import { Shell } from '../components/layout/Shell'
import { SectionLabel } from '../components/shared/Foundation'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useConnectorCapabilityRegistry, type CapabilityLevel, type ConnectorHealth } from '../hooks/useConnectorCapabilityRegistry'

function CapabilityBadge({ level }: { level: CapabilityLevel }) {
  const tone = level === 'LIVE' ? { fg: 'var(--green)', bg: 'var(--green-bg)' } : level === 'SIMULATED' ? { fg: 'var(--amber)', bg: 'var(--amber-bg)' } : { fg: 'var(--text-secondary)', bg: 'rgba(255,255,255,.04)' }
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg }}>{level === 'LIVE' ? 'Live' : level === 'SIMULATED' ? 'Simulated' : 'Stub'}</span>
}

function HealthBadge({ health }: { health: ConnectorHealth }) {
  const tone = health === 'HEALTHY' ? { fg: 'var(--green)', bg: 'var(--green-bg)' } : health === 'WARNING' ? { fg: 'var(--amber)', bg: 'var(--amber-bg)' } : health === 'ERROR' ? { fg: 'var(--red)', bg: 'var(--red-bg)' } : { fg: 'var(--text-secondary)', bg: 'rgba(255,255,255,.04)' }
  const label = health === 'HEALTHY' ? 'Healthy' : health === 'WARNING' ? 'Warning' : health === 'ERROR' ? 'Error' : 'Not Connected'
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg }}>{label}</span>
}

export default function ConnectorCapabilityRegistry() {
  const { entries, dataState, loading, error } = useConnectorCapabilityRegistry()
  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ display: 'grid', gap: 10 }}>
      <h1 style={{ margin: 0 }}>Connector Capability Registry</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>What each connector can actually do today — Discovery, Execution, and Verification capability, plus live connector health.</p>
      {dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}
      {error && dataState !== 'NOT_CONNECTED' && <div role='alert' style={{ border: 'var(--border-amber)', background: 'var(--amber-bg)', borderRadius: 10, padding: 12 }}>Connector registry data is unavailable: {error}</div>}
      {loading && <div role='status'>Loading connector capability registry…</div>}
    </header>

    <section data-testid='connector-capability-registry' style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>
      <SectionLabel>Connectors</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 8, marginTop: 12, fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}>
        <div>Connector</div><div>Discovery</div><div>Execution</div><div>Verification</div><div>Health</div>
      </div>
      {entries.map((entry) => (
        <div key={entry.type} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderTop: 'var(--border-default)', alignItems: 'center' }}>
          <div>{entry.name}</div>
          <div><CapabilityBadge level={entry.discovery} /></div>
          <div><CapabilityBadge level={entry.execution} /></div>
          <div><CapabilityBadge level={entry.verification} /></div>
          <div><HealthBadge health={entry.health} /></div>
        </div>
      ))}
    </section>
  </div></Shell>
}
