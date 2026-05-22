import { Zap, FileText, Activity, Download } from 'lucide-react'
import { formatRelativeTime, isSyncStale } from '../../lib/formatters'
import type { EvidenceSource } from '../../types/connector'

const ICON_MAP = {
  api:     Zap,
  billing: FileText,
  audit:   Activity,
  export:  Download,
}

function TrustColor(score: number): string {
  if (score >= 95) return 'var(--c-teal-600)'
  if (score >= 80) return 'var(--c-amber-600)'
  return 'var(--c-red-600)'
}

function StatusBadge({ status }: { status: EvidenceSource['status'] }) {
  const cfg = {
    ACTIVE:  { bg: 'var(--c-teal-50)',   text: 'var(--c-teal-600)',   label: 'Active' },
    LAGGING: { bg: 'var(--c-amber-50)',  text: 'var(--c-amber-600)',  label: 'Lagging' },
    FAILED:  { bg: 'var(--c-red-50)',    text: 'var(--c-red-600)',    label: 'Failed' },
  }[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 500,
      padding: '2px 7px', borderRadius: 10,
      background: cfg.bg, color: cfg.text,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.text }} />
      {cfg.label}
    </span>
  )
}

interface EvidenceSourceTableProps {
  sources: EvidenceSource[]
  connectorName: string
}

export function EvidenceSourceTable({ sources, connectorName }: EvidenceSourceTableProps) {
  if (sources.length === 0) {
    return (
      <div style={{
        background: 'var(--surface-0)',
        border: '0.5px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
          No evidence sources
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          Configure {connectorName} to start collecting data.
        </p>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface-0)',
      border: '0.5px solid var(--border-subtle)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr',
        padding: '8px 14px',
        background: 'var(--surface-2)',
        borderBottom: '0.5px solid var(--border-subtle)',
      }}>
        {['Source', 'Trust score', 'Last sync', 'Status'].map(h => (
          <span key={h} style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {h}
          </span>
        ))}
      </div>

      {sources.map((src, i) => {
        const Icon = ICON_MAP[src.iconType] ?? Zap
        const stale = isSyncStale(src.lastSyncAt, 4)
        return (
          <div
            key={src.id}
            style={{
              display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 0.8fr',
              padding: '10px 14px', fontSize: 12, alignItems: 'center',
              borderBottom: i < sources.length - 1 ? '0.5px solid var(--border-subtle)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, color: 'var(--text-primary)' }}>
              <Icon size={13} color="var(--text-tertiary)" />
              {src.name}
            </div>
            <div style={{ fontWeight: 500, color: TrustColor(src.trustScore) }}>
              {src.trustScore}%
            </div>
            <div style={{ fontSize: 11, color: stale ? 'var(--c-amber-600)' : 'var(--text-secondary)' }}>
              {formatRelativeTime(src.lastSyncAt)}
            </div>
            <div>
              <StatusBadge status={src.status} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
