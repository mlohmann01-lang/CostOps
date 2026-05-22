import { useState, useEffect } from 'react'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { CONNECTORS } from '../lib/mockData'
import { formatCurrency, formatRelativeTime } from '../lib/formatters'
import type { Domain } from '../types/connector'
import type { BlastRadius, RollbackClass } from '../types/governance'

function BlastBadge({ level }: { level: BlastRadius }) {
  const color = level === 'LOW' ? 'var(--c-teal-600)' : level === 'MEDIUM' ? 'var(--c-amber-600)' : 'var(--c-red-600)'
  return <span style={{ fontSize: 12, color }}>{level.charAt(0) + level.slice(1).toLowerCase()}</span>
}

function RollbackPill({ level }: { level: RollbackClass }) {
  const cfg = {
    FULL:    { bg: 'var(--c-gray-50)',  text: 'var(--c-gray-600)' },
    PARTIAL: { bg: 'var(--c-amber-50)', text: 'var(--c-amber-600)' },
    NONE:    { bg: 'var(--c-red-50)',   text: 'var(--c-red-600)' },
  }[level]
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: cfg.bg, color: cfg.text }}>
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    QUEUED:    { bg: 'var(--c-amber-50)', text: 'var(--c-amber-600)' },
    EXECUTING: { bg: 'var(--c-blue-50)',  text: 'var(--c-blue-600)' },
    COMPLETED: { bg: 'var(--c-teal-50)',  text: 'var(--c-teal-600)' },
    ROLLED_BACK: { bg: 'var(--c-gray-50)', text: 'var(--c-gray-600)' },
  }
  const { bg, text } = cfg[status] ?? { bg: 'var(--c-gray-50)', text: 'var(--c-gray-600)' }
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: bg, color: text }}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
    </span>
  )
}

interface ExecutionViewProps {
  params?: { domain?: string }
}

interface ExecutionRecord {
  id: number | string
  name: string
  domain?: string
  status: string
  approvedBy?: string
  approvedAt?: string
  executedAt?: string
  blastRadius?: BlastRadius
  rollback?: RollbackClass
  savingRealised?: number
  certId?: string
}

export default function ExecutionView({ params }: ExecutionViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const [queuedRecords, setQueuedRecords] = useState<ExecutionRecord[]>([])
  const [completedRecords, setCompletedRecords] = useState<ExecutionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchExecutionData = async () => {
      try {
        const [qRes, oRes] = await Promise.all([
          fetch('/api/execution/queue'),
          fetch('/api/outcomes'),
        ])
        if (!qRes.ok) throw new Error('Failed to fetch execution queue')
        if (!oRes.ok) throw new Error('Failed to fetch outcomes')

        const queue = await qRes.json()
        const outcomes = await oRes.json()

        setQueuedRecords(queue)
        setCompletedRecords(outcomes)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchExecutionData()
  }, [])

  const records = domain === 'all' ? [...queuedRecords, ...completedRecords] : [...queuedRecords, ...completedRecords].filter(r => r.domain === domain)
  const queued = queuedRecords.filter(r => domain === 'all' ? true : r.domain === domain)
  const completed = completedRecords.filter(r => domain === 'all' ? true : r.domain === domain)

  return (
    <Shell>
      <div style={{
        padding: '16px 20px 0',
        borderBottom: '0.5px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Execution</h1>
          <button style={{
            fontSize: 11, padding: '5px 11px',
            border: '0.5px solid var(--border-medium)', borderRadius: 8,
            background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Schedule
          </button>
        </div>
        <DomainTabs connectors={CONNECTORS} currentDomain={domain} basePath="/:domain/execution" />
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
            Loading execution data...
          </div>
        ) : (
          <>
            {/* Execution queue */}
            {queued.length > 0 && (
          <>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Approved — awaiting execution ({queued.length})
              </span>
            </div>
            <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.7fr 0.8fr', padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border-subtle)' }}>
                {['Action', 'Approved by', 'Approved at', 'Blast', 'Rollback', 'Execute'].map(h => (
                  <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {queued.map((r, i) => (
                <div key={r.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.7fr 0.8fr',
                  padding: '11px 16px', fontSize: 12, alignItems: 'center',
                  borderBottom: i < queued.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.approvedBy ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.approvedAt ? formatRelativeTime(r.approvedAt) : '—'}</div>
                  <BlastBadge level={r.blastRadius ?? 'LOW'} />
                  <RollbackPill level={r.rollback ?? 'FULL'} />
                  <button style={{
                    fontSize: 11, padding: '4px 10px',
                    background: 'var(--c-teal-400)', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Execute now
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Completed */}
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Completed ({completed.length})
          </span>
        </div>
        <div style={{ background: 'var(--surface-0)', border: '0.5px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1.2fr', padding: '8px 16px', background: 'var(--surface-2)', borderBottom: '0.5px solid var(--border-subtle)' }}>
            {['Action', 'Executed', 'Saving realised', 'Rollback', 'Cert ID'].map(h => (
              <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>
          {completed.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
              No completed executions yet.
            </div>
          ) : (
            completed.map((r, i) => (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.8fr 1.2fr',
                padding: '11px 16px', fontSize: 12, alignItems: 'center',
                borderBottom: i < completed.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
              }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.executedAt ? formatRelativeTime(r.executedAt) : '—'}</div>
                <div style={{ fontWeight: 500, color: 'var(--c-teal-600)' }}>{r.savingRealised ? formatCurrency(r.savingRealised) + '/mo' : '—'}</div>
                <RollbackPill level={r.rollback ?? 'FULL'} />
                <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-tertiary)' }}>{r.certId ?? '—'}</div>
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
