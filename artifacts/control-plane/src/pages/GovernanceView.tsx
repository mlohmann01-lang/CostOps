import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { VerdictBadge } from '../components/shared/VerdictBadge'
import { CONNECTORS, AUDIT_ENTRIES } from '../lib/mockData'
import { formatRelativeTime } from '../lib/formatters'
import type { Domain } from '../types/connector'

interface GovernanceViewProps {
  params?: { domain?: string }
}

export default function GovernanceView({ params }: GovernanceViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const entries = domain === 'all' ? AUDIT_ENTRIES : AUDIT_ENTRIES.filter(e => e.domain === domain)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = entries.find((x) => x.id === selectedId)

  return (
    <Shell>
      <div style={{
        padding: '16px 20px 0',
        borderBottom: '0.5px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Governance</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{
              fontSize: 11, padding: '5px 11px',
              border: '0.5px solid var(--border-medium)', borderRadius: 8,
              background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Export log
            </button>
            <button style={{
              fontSize: 11, padding: '5px 11px',
              border: '0.5px solid var(--border-medium)', borderRadius: 8,
              background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Filter
            </button>
          </div>
        </div>
        <DomainTabs connectors={CONNECTORS} currentDomain={domain} basePath="/:domain/governance" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Audit log — {entries.length} entries
          </span>
        </div>

        <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.2fr 0.8fr',
            padding: '8px 16px', background: 'var(--surface-2)',
            borderBottom: '0.5px solid var(--border-subtle)',
          }}>
            {['Timestamp', 'Action', 'Verdict', 'Cert ID', 'Actor'].map(h => (
              <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {h}
              </span>
            ))}
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              No audit entries for this domain.
            </div>
          ) : (
            entries.map((entry, i) => (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.2fr 0.8fr',
                  padding: '11px 16px', fontSize: 12, alignItems: 'center',
                  width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                  cursor: 'pointer',
                  borderBottom: i < entries.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>
                  {formatRelativeTime(entry.timestamp)}
                </div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', paddingRight: 12 }}>
                  {entry.action}
                </div>
                <div><VerdictBadge verdict={entry.verdict} /></div>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>
                  {entry.certId ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {entry.actorId}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selected && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)' }} onClick={() => setSelectedId(null)}><div style={{ background: 'white', padding: 16, margin: '7% auto', width: 520 }} onClick={(e) => e.stopPropagation()}>
        <h3>Audit detail</h3>
        <p><strong>Cert ID:</strong> {selected.certId ?? 'Unavailable'}</p>
        <p><strong>Actor:</strong> {selected.actorId}</p>
        <p><strong>Verdict:</strong> {selected.verdict}</p>
        <p><strong>Action:</strong> {selected.action}</p>
        <p><strong>Domain:</strong> {selected.domain}</p>
        <p><strong>Timestamp:</strong> {selected.timestamp}</p>
        {selected.verdict === 'NEVER_ELIGIBLE' && <p>No rollback, committed spend, non-reversible action, and policy block conditions are active.</p>}
      </div></div>}

      <CommandBar />
    </Shell>
  )
}
