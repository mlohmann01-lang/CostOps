import React, { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { SectionLabel } from '../components/shared/Foundation'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useCanonicalOutcomeLedger } from '../hooks/useCanonicalOutcomeLedger'
import {
  calculateOutcomeLeakage,
  buildOutcomeProofTimeline,
  type OutcomeRecord,
  type OutcomeLifecycleStage,
} from '../lib/outcomeLedger/outcomeLedger'

// ─── Formatters ───────────────────────────────────────────────────────────────

function money(value: number | null | undefined): string {
  if (value == null) return '—'
  return `$${Math.round(value).toLocaleString()}`
}

function stageValue(record: OutcomeRecord, stage: OutcomeLifecycleStage): string {
  const stageOrder: OutcomeLifecycleStage[] = [
    'PROJECTED', 'APPROVED', 'EXECUTED', 'VERIFIED', 'FINANCE_CONFIRMED', 'PROTECTED',
  ]
  const currentIndex = stageOrder.indexOf(record.lifecycleStage as OutcomeLifecycleStage)
  const targetIndex = stageOrder.indexOf(stage)
  if (targetIndex > currentIndex) return '—'
  switch (stage) {
    case 'PROJECTED': return money(record.projectedValue)
    case 'APPROVED': return money(record.approvedValue)
    case 'EXECUTED': return money(record.executedValue)
    case 'VERIFIED': return money(record.verifiedValue)
    case 'FINANCE_CONFIRMED': return money(record.financeConfirmedValue)
    case 'PROTECTED': return money(record.protectedValue)
    default: return '—'
  }
}

function proofBadge(stage: OutcomeLifecycleStage) {
  const MAP: Record<string, { label: string; color: string; bg: string }> = {
    PROJECTED:         { label: 'Projected',         color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.06)' },
    APPROVED:          { label: 'Approved',           color: '#FFCC4D',               bg: 'rgba(245,196,81,0.08)' },
    EXECUTED:          { label: 'Executed',           color: '#60CDFF',               bg: 'rgba(96,205,255,0.08)' },
    VERIFIED:          { label: 'Verified',           color: '#18C37E',               bg: 'rgba(24,195,126,0.10)' },
    FINANCE_CONFIRMED: { label: 'Finance Confirmed',  color: '#18C37E',               bg: 'rgba(24,195,126,0.12)' },
    PROTECTED:         { label: 'Protected',          color: '#7ED3A8',               bg: 'rgba(126,211,168,0.12)' },
    FAILED:            { label: 'Failed',             color: 'var(--red)',            bg: 'rgba(226,75,74,0.10)' },
    DRIFTED:           { label: 'Drifted',            color: 'var(--amber)',          bg: 'rgba(239,159,39,0.10)' },
  }
  const c = MAP[stage] ?? MAP['PROJECTED']!
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      color: c.color, background: c.bg,
      border: `0.5px solid ${c.color}`,
      borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border-default)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: muted ? 'var(--text-muted)' : 'var(--text-primary)', letterSpacing: '-0.5px' }}>{value}</div>
    </div>
  )
}

function LeakageKpi({ label, value }: { label: string; value: number }) {
  const isZero = value === 0
  return (
    <div style={{ fontSize: 12 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
      <span style={{ fontWeight: 700, color: isZero ? 'var(--green)' : 'var(--amber)' }}>
        {isZero ? '—' : money(value)}
      </span>
    </div>
  )
}

function BacklogPill({ label, count, tone }: { label: string; count: number; tone: 'amber' | 'blue' | 'muted' }) {
  const color = tone === 'amber' ? 'var(--amber)' : tone === 'blue' ? '#60CDFF' : 'var(--text-secondary)'
  const bg = tone === 'amber' ? 'rgba(239,159,39,0.08)' : tone === 'blue' ? 'rgba(96,205,255,0.08)' : 'rgba(255,255,255,0.05)'
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color,
      background: count > 0 ? bg : 'rgba(255,255,255,0.04)',
      border: `0.5px solid ${count > 0 ? color : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 999, padding: '3px 10px',
    }}>
      {count} {label}
    </span>
  )
}

function TimelinePanel({ record, events }: { record: OutcomeRecord; events: readonly any[] }) {
  const timeline = buildOutcomeProofTimeline(record, events as any[])
  if (!timeline.length) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No ledger events recorded.</div>
  return (
    <div data-testid={`outcome-timeline-${record.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {timeline.map((entry, idx) => (
        <div key={`${entry.eventType}-${idx}`} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: idx < timeline.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 2 }} />
            {idx < timeline.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.12)', marginTop: 3 }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{entry.eventType.replace(/_/g, ' ')}</span>
              {entry.valueDelta !== undefined && entry.valueDelta !== 0 && (
                <span style={{ fontSize: 11, color: entry.valueDelta > 0 ? 'var(--green)' : 'var(--amber)' }}>
                  {entry.valueDelta > 0 ? '+' : ''}{money(entry.valueDelta)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {entry.actorName && <> · {entry.actorName}</>}
              {entry.reason && <> · <span style={{ fontStyle: 'italic' }}>{entry.reason}</span></>}
              {entry.evidenceIds.length > 0 && <> · {entry.evidenceIds.length} evidence</>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Table row ────────────────────────────────────────────────────────────────

function LedgerRow({ record, events }: { record: OutcomeRecord; events: readonly any[] }) {
  const [expanded, setExpanded] = useState(false)
  const leakage = calculateOutcomeLeakage(record)
  const cols = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'
  return (
    <div data-testid={`ledger-row-${record.id}`}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 4px', fontSize: 12, alignItems: 'center' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ lineHeight: 1.3 }}>{record.name}</span>
        </button>
        <span data-testid="col-projected">{stageValue(record, 'PROJECTED')}</span>
        <span data-testid="col-approved">{stageValue(record, 'APPROVED')}</span>
        <span data-testid="col-executed">{stageValue(record, 'EXECUTED')}</span>
        <span data-testid="col-verified">{stageValue(record, 'VERIFIED')}</span>
        <span data-testid="col-finance-confirmed">{stageValue(record, 'FINANCE_CONFIRMED')}</span>
        <span data-testid="col-protected">{stageValue(record, 'PROTECTED')}</span>
        <span data-testid="col-value-leakage" style={{ color: leakage.totalValueLeakage > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
          {leakage.totalValueLeakage > 0 ? money(leakage.totalValueLeakage) : '—'}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          {record.confidenceScore != null ? `${Math.round(record.confidenceScore * 100)}%` : '—'}
        </span>
        <span data-testid="col-proof-state">{proofBadge(record.proofState as OutcomeLifecycleStage)}</span>
      </div>
      {expanded && (
        <div style={{ padding: '8px 12px 12px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Proof Timeline</div>
          <TimelinePanel record={record} events={events} />
        </div>
      )}
    </div>
  )
}

// ─── Empty state (LIVE_UNCONNECTED / NO_DATA) ─────────────────────────────────

function EmptyLedger({ dataState }: { dataState: string }) {
  return (
    <div data-testid="empty-ledger" style={{ padding: '40px 20px', textAlign: 'center' }}>
      <DataStateBanner state={dataState === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'NO_DATA'} />
      <div style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 14 }}>
        {dataState === 'NOT_CONNECTED'
          ? 'Connect Microsoft 365 or another supported platform to begin discovery.'
          : 'No outcomes recorded yet. Outcomes will appear as discovery completes.'}
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function OutcomeLedgerView() {
  const { records, events, summary, dataState, isEmptyLive } = useCanonicalOutcomeLedger()

  if (isEmptyLive) {
    return (
      <Shell>
        <div style={{ padding: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>Outcome Ledger</h1>
          <EmptyLedger dataState={dataState} />
        </div>
      </Shell>
    )
  }

  const tableColumns = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'

  return (
    <Shell>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Outcome Ledger</h1>
          {dataState !== 'LIVE' && <DataStateBanner state={dataState === 'DEMO' ? 'DEMO' : 'SIMULATION'} />}
        </div>

        {/* ── Lifecycle value summary ── */}
        <section data-testid="outcome-summary-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          <KpiCard label="Projected" value={money(summary.totalProjectedValue)} />
          <KpiCard label="Approved" value={summary.totalApprovedValue > 0 ? money(summary.totalApprovedValue) : '—'} muted={summary.totalApprovedValue === 0} />
          <KpiCard label="Executed" value={summary.totalExecutedValue > 0 ? money(summary.totalExecutedValue) : '—'} muted={summary.totalExecutedValue === 0} />
          <KpiCard label="Verified" value={summary.totalVerifiedValue > 0 ? money(summary.totalVerifiedValue) : '—'} muted={summary.totalVerifiedValue === 0} />
          <KpiCard label="Finance Confirmed" value={summary.totalFinanceConfirmedValue > 0 ? money(summary.totalFinanceConfirmedValue) : '—'} muted={summary.totalFinanceConfirmedValue === 0} />
          <KpiCard label="Protected" value={summary.totalProtectedValue > 0 ? money(summary.totalProtectedValue) : '—'} muted={summary.totalProtectedValue === 0} />
        </section>

        {/* ── Value leakage strip ── */}
        <section data-testid="outcome-leakage-strip" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Value Leakage</span>
          <LeakageKpi label="Approval" value={summary.totalApprovalLeakage} />
          <LeakageKpi label="Execution" value={summary.totalExecutionLeakage} />
          <LeakageKpi label="Verification" value={summary.totalVerificationLeakage} />
          <LeakageKpi label="Finance" value={summary.totalFinanceLeakage} />
          <LeakageKpi label="Drift" value={summary.totalDriftLeakage} />
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: summary.totalValueLeakage > 0 ? 'var(--amber)' : 'var(--green)' }}>
            Total: {summary.totalValueLeakage > 0 ? money(summary.totalValueLeakage) : '—'}
          </span>
        </section>

        {/* ── Backlog / pipeline health ── */}
        <section data-testid="outcome-pipeline-health" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <BacklogPill label="Verification Backlog" count={summary.verificationBacklogCount} tone="blue" />
          <BacklogPill label="Finance Backlog" count={summary.financeBacklogCount} tone="amber" />
          <BacklogPill label="Protection Backlog" count={summary.protectionBacklogCount} tone="amber" />
          <BacklogPill label="Failed" count={summary.failedOutcomeCount} tone="muted" />
          <BacklogPill label="Drifted" count={summary.driftedOutcomeCount} tone="amber" />
        </section>

        {/* ── Outcome Proof Authority table ── */}
        <section data-testid="outcome-proof-authority" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 16 }}>
          <SectionLabel>Outcome Proof Authority</SectionLabel>

          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: tableColumns, gap: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginTop: 12, padding: '0 4px' }}>
            <span>Outcome</span>
            <span>Projected</span>
            <span>Approved</span>
            <span>Executed</span>
            <span>Verified</span>
            <span>Finance Confirmed</span>
            <span>Protected</span>
            <span>Value Leakage</span>
            <span>Confidence</span>
            <span>Proof State</span>
          </div>

          {records.map(record => (
            <LedgerRow key={record.id} record={record} events={events} />
          ))}

          {records.length === 0 && (
            <div style={{ padding: '20px 4px', fontSize: 13, color: 'var(--text-muted)' }}>No outcomes to display.</div>
          )}
        </section>

      </div>
    </Shell>
  )
}
