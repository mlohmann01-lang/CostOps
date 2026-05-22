import { useState, useEffect } from 'react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { VerdictBadge } from '../components/shared/VerdictBadge'
import { CONNECTORS } from '../lib/mockData'
import { formatRelativeTime } from '../lib/formatters'
import type { Domain } from '../types/connector'
import type { Verdict } from '../types/governance'

interface GovernanceViewProps {
  params?: { domain?: string }
}

interface AuditEntry {
  id: number | string
  timestamp: string
  action: string
  verdict: string
  domain?: string
  certId?: string
  actorId: string
}

export default function GovernanceView({ params }: GovernanceViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAuditLog = async () => {
      try {
        const res = await fetch('/api/governance/audit')
        if (!res.ok) throw new Error('Failed to fetch audit log')
        const data = await res.json()
        setEntries(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchAuditLog()
  }, [])

  const filteredEntries = domain === 'all' ? entries : entries.filter(e => e.domain === domain)

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
        {error && (
          <div style={{
            padding: '12px 16px', marginBottom: 16,
            background: 'var(--c-red-50)', border: '0.5px solid var(--c-red-200)',
            borderRadius: 8, color: 'var(--c-red-700)', fontSize: 12
          }}>
            Error: {error}
          </div>
        )}
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading audit log...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Audit log — {filteredEntries.length} entries
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

              {filteredEntries.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                  No audit entries for this domain.
                </div>
              ) : (
                filteredEntries.map((entry, i) => (
              <div
                key={entry.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1.2fr 0.8fr',
                  padding: '11px 16px', fontSize: 12, alignItems: 'center',
                  borderBottom: i < entries.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
                }}
              >
                <div style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>
                  {formatRelativeTime(entry.timestamp)}
                </div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', paddingRight: 12 }}>
                  {entry.action}
                </div>
                <div><VerdictBadge verdict={entry.verdict as Verdict} /></div>
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>
                  {entry.certId ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {entry.actorId}
                </div>
              </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <CommandBar />
    </Shell>
  )
}
