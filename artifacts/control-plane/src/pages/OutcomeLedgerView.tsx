import React, { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useCanonicalOutcomeLedger } from '../hooks/useCanonicalOutcomeLedger'
import {
  calculateOutcomeLeakage,
  buildOutcomeProofTimeline,
  type OutcomeRecord,
  type OutcomeLedgerSummary,
  type OutcomeLedgerEvent,
  type OutcomeLifecycleStage,
  type ProofTimelineEntry,
} from '../lib/outcomeLedger/outcomeLedger'

// ─── Utilities ────────────────────────────────────────────────────────────────

function money(v: number | null | undefined): string {
  if (v == null) return '—'
  return `$${Math.round(v).toLocaleString()}`
}

const STAGE_ORDER: OutcomeLifecycleStage[] = [
  'PROJECTED', 'APPROVED', 'EXECUTED', 'VERIFIED', 'FINANCE_CONFIRMED', 'PROTECTED',
]

function stageIndex(s: string): number {
  return STAGE_ORDER.indexOf(s as OutcomeLifecycleStage)
}

function stageReachedValue(record: OutcomeRecord, stage: OutcomeLifecycleStage): number | undefined {
  const ci = stageIndex(record.lifecycleStage)
  const ti = stageIndex(stage)
  if (ti > ci) return undefined
  const map: Partial<Record<OutcomeLifecycleStage, number | undefined>> = {
    PROJECTED: record.projectedValue,
    APPROVED: record.approvedValue,
    EXECUTED: record.executedValue,
    VERIFIED: record.verifiedValue,
    FINANCE_CONFIRMED: record.financeConfirmedValue,
    PROTECTED: record.protectedValue,
  }
  return map[stage]
}

function stageColor(s: string): string {
  if (s === 'PROJECTED' || s === 'APPROVED') return '#F5C451'
  if (s === 'EXECUTED') return '#60CDFF'
  if (s === 'VERIFIED' || s === 'FINANCE_CONFIRMED') return '#18C37E'
  if (s === 'PROTECTED') return '#7ED3A8'
  if (s === 'FAILED') return '#E24B4A'
  if (s === 'DRIFTED') return '#EF9F27'
  return '#8B949E'
}

const STAGE_LABELS: Record<string, string> = {
  PROJECTED: 'Projected', APPROVED: 'Approved', EXECUTED: 'Executed',
  VERIFIED: 'Verified', FINANCE_CONFIRMED: 'Finance Confirmed',
  PROTECTED: 'Protected', FAILED: 'Failed', DRIFTED: 'Drifted',
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function ProofBadge({ stage }: { stage: string }) {
  const color = stageColor(stage)
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      color, background: `${color}20`, border: `0.5px solid ${color}80`,
      borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}

function EvidenceBadge({ count }: { count: number }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color: count > 0 ? '#F5C451' : 'var(--text-muted)',
      background: count > 0 ? 'rgba(245,196,81,0.08)' : 'rgba(255,255,255,0.04)',
      border: `0.5px solid ${count > 0 ? 'rgba(245,196,81,0.30)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 999, padding: '2px 7px',
    }}>
      {count > 0 ? `${count} ev` : '—'}
    </span>
  )
}

function ConfidenceBadge({ score }: { score: number | undefined }) {
  if (score == null) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
  const color = score >= 0.85 ? '#18C37E' : score >= 0.70 ? '#F5C451' : '#EF9F27'
  return <span style={{ fontSize: 12, fontWeight: 700, color }}>{Math.round(score * 100)}%</span>
}

function PageSection({
  title, subtitle, children, testId,
}: {
  title: string; subtitle?: string; children: React.ReactNode; testId?: string
}) {
  return (
    <section
      data-testid={testId}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '22px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  )
}

// ─── SECTION 1 — Executive Hero ───────────────────────────────────────────────

function OutcomeHeroMetric({
  label, value, sub, color,
}: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--surface-0)',
      border: `1px solid ${color ? `${color}35` : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14, padding: '18px 20px',
      boxShadow: color ? `0 0 20px ${color}0a` : 'none',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-1px', color: color ?? 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

// ─── SECTION 2 — Value Waterfall ─────────────────────────────────────────────

const WATERFALL_STAGES: { key: keyof OutcomeLedgerSummary; label: string; color: string }[] = [
  { key: 'totalProjectedValue',      label: 'Projected',          color: '#F5C451' },
  { key: 'totalApprovedValue',       label: 'Approved',           color: '#F5C451' },
  { key: 'totalExecutedValue',       label: 'Executed',           color: '#60CDFF' },
  { key: 'totalVerifiedValue',       label: 'Verified',           color: '#18C37E' },
  { key: 'totalFinanceConfirmedValue', label: 'Finance Confirmed', color: '#18C37E' },
  { key: 'totalProtectedValue',      label: 'Protected',          color: '#7ED3A8' },
]

function ValueWaterfall({ summary }: { summary: OutcomeLedgerSummary }) {
  const projected = summary.totalProjectedValue
  if (!projected) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
        No value data to display.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {WATERFALL_STAGES.map(({ key, label, color }, idx) => {
        const value = summary[key] as number
        const prev = idx > 0 ? (summary[WATERFALL_STAGES[idx - 1]!.key] as number) : projected
        const barPct = Math.max(0, Math.min(100, projected > 0 ? (value / projected) * 100 : 0))
        const delta = value - prev
        const retainedPct = prev > 0 ? Math.round((value / prev) * 100) : 100
        const hasValue = value > 0
        return (
          <div key={label}>
            {idx > 0 && delta < 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0 2px 130px' }}>
                <div style={{ width: 1, height: 10, background: 'rgba(226,75,74,0.35)' }} />
                <span style={{ fontSize: 10, color: 'rgba(226,75,74,0.75)', fontWeight: 600 }}>
                  ↓ {money(Math.abs(delta))} lost
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 118, textAlign: 'right', fontSize: 12, fontWeight: 600, color: hasValue ? 'var(--text-primary)' : 'var(--text-muted)', flexShrink: 0 }}>
                {label}
              </div>
              <div style={{ flex: 1, height: 30, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                {hasValue ? (
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
                    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                  }}>
                    {barPct > 18 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: idx < 2 ? '#0A0E14' : '#0A1A12' }}>
                        {Math.round(barPct)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                  </div>
                )}
              </div>
              <div style={{ width: 130, flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: hasValue ? color : 'var(--text-muted)' }}>
                  {hasValue ? money(value) : '—'}
                </div>
                {idx > 0 && hasValue && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{retainedPct}% retained</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── SECTION 3 — Outcome Pipeline Board ──────────────────────────────────────

const PIPELINE_COLS: { stage: OutcomeLifecycleStage; label: string }[] = [
  { stage: 'PROJECTED',         label: 'Projected' },
  { stage: 'APPROVED',          label: 'Approved' },
  { stage: 'EXECUTED',          label: 'Executed' },
  { stage: 'VERIFIED',          label: 'Verified' },
  { stage: 'FINANCE_CONFIRMED', label: 'Finance Confirmed' },
  { stage: 'PROTECTED',         label: 'Protected' },
]

function OutcomePipelineCard({
  record, onExpand,
}: { record: OutcomeRecord; onExpand: () => void }) {
  const color = stageColor(record.lifecycleStage)
  const primaryValue = stageReachedValue(record, record.lifecycleStage as OutcomeLifecycleStage) ?? record.projectedValue
  const leakage = calculateOutcomeLeakage(record)
  const evidenceCount = record.approvalEvidenceIds.length + record.executionEvidenceIds.length +
    record.verificationEvidenceIds.length + record.financeEvidenceIds.length + record.protectionEvidenceIds.length
  return (
    <button
      onClick={onExpand}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--surface-0)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 10, padding: '10px 12px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{record.name}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{money(primaryValue)}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {record.ownerName && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{record.ownerName}</span>
        )}
        {record.confidenceScore != null && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{Math.round(record.confidenceScore * 100)}% conf</span>
        )}
        <EvidenceBadge count={evidenceCount} />
      </div>
      {leakage.totalValueLeakage > 0 && (
        <span style={{ fontSize: 10, color: '#EF9F27' }}>↓ {money(leakage.totalValueLeakage)} leakage</span>
      )}
    </button>
  )
}

function OutcomePipelineBoard({
  records, onExpand,
}: { records: OutcomeRecord[]; onExpand: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(140px, 1fr))', gap: 10, minWidth: 760 }}>
      {PIPELINE_COLS.map(({ stage, label }) => {
        const colRecords = records.filter(r => r.lifecycleStage === stage || r.proofState === stage)
        const color = stageColor(stage)
        return (
          <div key={stage}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              {label}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({colRecords.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {colRecords.map(r => (
                <OutcomePipelineCard key={r.id} record={r} onExpand={() => onExpand(r.id)} />
              ))}
              {colRecords.length === 0 && (
                <div style={{
                  height: 56, background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.07)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>—</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── SECTION 4 — Value Leakage ────────────────────────────────────────────────

const LEAKAGE_ROWS: { key: keyof OutcomeLedgerSummary; label: string; desc: string }[] = [
  { key: 'totalApprovalLeakage',      label: 'Approval Leakage',      desc: 'Projected → Approved' },
  { key: 'totalExecutionLeakage',     label: 'Execution Leakage',     desc: 'Approved → Executed' },
  { key: 'totalVerificationLeakage',  label: 'Verification Leakage',  desc: 'Executed → Verified' },
  { key: 'totalFinanceLeakage',       label: 'Finance Leakage',       desc: 'Verified → Finance Confirmed' },
  { key: 'totalDriftLeakage',         label: 'Drift Leakage',         desc: 'Finance Confirmed → Protected' },
]

function LeakageBreakdown({ summary }: { summary: OutcomeLedgerSummary }) {
  const projected = summary.totalProjectedValue
  const maxLeakage = Math.max(...LEAKAGE_ROWS.map(r => summary[r.key] as number), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {LEAKAGE_ROWS.map(({ key, label, desc }) => {
        const value = summary[key] as number
        const barPct = maxLeakage > 0 ? (value / maxLeakage) * 100 : 0
        const projPct = projected > 0 ? ((value / projected) * 100).toFixed(1) : '0'
        const isHigh = projected > 0 && value > projected * 0.10
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 170, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: value > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <div style={{ flex: 1, height: 22, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
              {value > 0 && (
                <div style={{
                  height: '100%', width: `${barPct}%`,
                  background: isHigh ? 'rgba(226,75,74,0.60)' : 'rgba(239,159,39,0.55)',
                  borderRadius: 4,
                }} />
              )}
            </div>
            <div style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: value > 0 ? (isHigh ? '#E24B4A' : '#EF9F27') : 'var(--text-muted)' }}>
                {value > 0 ? money(value) : '—'}
              </div>
              {value > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{projPct}% of projected</div>
              )}
            </div>
          </div>
        )
      })}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Total Value Leakage</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: summary.totalValueLeakage > 0 ? '#EF9F27' : '#18C37E' }}>
          {summary.totalValueLeakage > 0 ? money(summary.totalValueLeakage) : '—'}
        </span>
      </div>
    </div>
  )
}

// ─── SECTION 5 — Proof Timeline ───────────────────────────────────────────────

function TimelineEvent({ entry, isLast }: { entry: ProofTimelineEntry; isLast: boolean }) {
  const color = entry.stage ? stageColor(entry.stage) : '#F5C451'
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 3, flexShrink: 0 }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.10)', marginTop: 3 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
            {entry.eventType.replace(/_/g, ' ')}
          </span>
          {entry.valueDelta !== undefined && entry.valueDelta !== 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: entry.valueDelta > 0 ? '#18C37E' : '#EF9F27' }}>
              {entry.valueDelta > 0 ? '+' : ''}{money(entry.valueDelta)}
            </span>
          )}
          {entry.stage && <ProofBadge stage={entry.stage} />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
          {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {entry.actorName && <> · <span style={{ color: 'var(--text-secondary)' }}>{entry.actorName}</span></>}
          {entry.reason && <> · <em>{entry.reason}</em></>}
          {entry.evidenceIds.length > 0 && (
            <> · <span style={{ color: '#F5C451' }}>{entry.evidenceIds.length} evidence</span></>
          )}
        </div>
      </div>
    </div>
  )
}

function ProofTimeline({
  record, events,
}: { record: OutcomeRecord; events: OutcomeLedgerEvent[] }) {
  const [open, setOpen] = useState(false)
  const timeline = buildOutcomeProofTimeline(record, events)
  const leakage = calculateOutcomeLeakage(record)
  const color = stageColor(record.lifecycleStage)
  const primaryValue = stageReachedValue(record, record.lifecycleStage as OutcomeLifecycleStage) ?? record.projectedValue
  return (
    <div
      data-testid={`outcome-timeline-${record.id}`}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{open ? '▼' : '▶'}</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{record.name}</span>
          <ProofBadge stage={record.proofState} />
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color }}>{money(primaryValue)}</span>
          {leakage.totalValueLeakage > 0 && (
            <span style={{ fontSize: 11, color: '#EF9F27' }}>↓ {money(leakage.totalValueLeakage)}</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeline.length} events</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {timeline.length === 0 ? (
            <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>No ledger events recorded.</div>
          ) : (
            <div style={{ paddingTop: 14 }}>
              {timeline.map((entry, idx) => (
                <TimelineEvent key={`${entry.eventType}-${idx}`} entry={entry} isLast={idx === timeline.length - 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SECTION 6 — Ledger Table (Outcome Proof Authority) ──────────────────────

function LedgerTableRow({
  record, onFocus,
}: { record: OutcomeRecord; onFocus: () => void }) {
  const leakage = calculateOutcomeLeakage(record)
  const evidenceCount = record.approvalEvidenceIds.length + record.executionEvidenceIds.length +
    record.verificationEvidenceIds.length + record.financeEvidenceIds.length + record.protectionEvidenceIds.length
  const cols = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'
  return (
    <div
      data-testid={`ledger-row-${record.id}`}
      style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '9px 0', fontSize: 12, alignItems: 'center' }}
    >
      <button
        onClick={onFocus}
        style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.3 }}
      >
        {record.name}
      </button>
      <span><ProofBadge stage={record.lifecycleStage} /></span>
      <span data-testid="col-projected" style={{ color: '#F5C451', fontWeight: 700 }}>{money(record.projectedValue)}</span>
      <span data-testid="col-approved">{record.approvedValue != null ? money(record.approvedValue) : '—'}</span>
      <span data-testid="col-executed">{record.executedValue != null ? money(record.executedValue) : '—'}</span>
      <span data-testid="col-verified">{record.verifiedValue != null ? money(record.verifiedValue) : '—'}</span>
      <span data-testid="col-finance-confirmed">{record.financeConfirmedValue != null ? money(record.financeConfirmedValue) : '—'}</span>
      <span data-testid="col-protected">{record.protectedValue != null ? money(record.protectedValue) : '—'}</span>
      <span data-testid="col-value-leakage" style={{ color: leakage.totalValueLeakage > 0 ? '#EF9F27' : 'var(--text-muted)' }}>
        {leakage.totalValueLeakage > 0 ? money(leakage.totalValueLeakage) : '—'}
      </span>
      <ConfidenceBadge score={record.confidenceScore} />
      <EvidenceBadge count={evidenceCount} />
      <span data-testid="col-proof-state"><ProofBadge stage={record.proofState} /></span>
    </div>
  )
}

function LedgerTable({
  records, onFocus,
}: { records: OutcomeRecord[]; onFocus: (id: string) => void }) {
  const cols = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr'
  return (
    <div data-testid="outcome-proof-authority">
      {/* Column headers — Outcome Proof Authority audit surface */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span>Outcome</span>
        <span>Lifecycle</span>
        <span>Projected</span>
        <span>Approved</span>
        <span>Executed</span>
        <span>Verified</span>
        <span>Finance Confirmed</span>
        <span>Protected</span>
        <span>Value Leakage</span>
        <span>Confidence</span>
        <span>Evidence</span>
        <span>Proof State</span>
      </div>
      {records.map(r => (
        <LedgerTableRow key={r.id} record={r} onFocus={() => onFocus(r.id)} />
      ))}
      {records.length === 0 && (
        <div style={{ padding: '20px 0', fontSize: 13, color: 'var(--text-muted)' }}>No ledger entries.</div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyLedger({ dataState }: { dataState: string }) {
  return (
    <div data-testid="empty-ledger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DataStateBanner state={dataState === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'NO_DATA'} />
      <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>No Outcomes Yet</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400 }}>
          Connect Microsoft 365 or another supported platform to begin building your Outcome Ledger.
        </div>
      </div>
    </div>
  )
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function OutcomeLedgerView() {
  const { records, events, summary, dataState, isEmptyLive } = useCanonicalOutcomeLedger()
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const handleFocus = (id: string) => setFocusedId(prev => (prev === id ? null : id))

  return (
    <Shell>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Page header */}
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>
            Outcome Ledger
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
            Financial chain of custody for every technology decision.
          </p>
        </div>

        {dataState !== 'LIVE' && (
          <DataStateBanner
            state={dataState === 'DEMO' ? 'DEMO' : dataState === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'SIMULATION'}
          />
        )}

        {isEmptyLive ? (
          <EmptyLedger dataState={dataState} />
        ) : (
          <>
            {/* Section 1 — Executive Hero */}
            <div>
              <section
                data-testid="outcome-summary-kpis"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}
              >
                <OutcomeHeroMetric
                  label="Projected Value"
                  value={money(summary.totalProjectedValue)}
                  sub={`${summary.outcomeCount} outcome${summary.outcomeCount !== 1 ? 's' : ''} tracked`}
                  color="#F5C451"
                />
                <OutcomeHeroMetric
                  label="Verified Value"
                  value={summary.totalVerifiedValue > 0 ? money(summary.totalVerifiedValue) : '—'}
                  sub={`${summary.verifiedOutcomeCount} verified`}
                  color="#18C37E"
                />
                <OutcomeHeroMetric
                  label="Finance Confirmed"
                  value={summary.totalFinanceConfirmedValue > 0 ? money(summary.totalFinanceConfirmedValue) : '—'}
                  sub={`${summary.financeConfirmedOutcomeCount} finance confirmed`}
                  color="#18C37E"
                />
                <OutcomeHeroMetric
                  label="Protected Value"
                  value={summary.totalProtectedValue > 0 ? money(summary.totalProtectedValue) : '—'}
                  sub={`${summary.protectedOutcomeCount} protected`}
                  color="#7ED3A8"
                />
              </section>

              {/* Secondary indicators */}
              <section
                data-testid="outcome-pipeline-health"
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
              >
                {[
                  { label: 'Value Leakage', value: summary.totalValueLeakage > 0 ? money(summary.totalValueLeakage) : '—', color: summary.totalValueLeakage > 0 ? '#EF9F27' : '#18C37E' },
                  { label: 'Verification Backlog', value: String(summary.verificationBacklogCount), color: summary.verificationBacklogCount > 0 ? '#60CDFF' : 'var(--text-muted)' },
                  { label: 'Finance Backlog', value: String(summary.financeBacklogCount), color: summary.financeBacklogCount > 0 ? '#EF9F27' : 'var(--text-muted)' },
                  { label: 'Drift', value: String(summary.driftedOutcomeCount), color: summary.driftedOutcomeCount > 0 ? '#E24B4A' : 'var(--text-muted)' },
                  { label: 'Failed', value: String(summary.failedOutcomeCount), color: summary.failedOutcomeCount > 0 ? '#E24B4A' : 'var(--text-muted)' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'baseline' }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
                  </div>
                ))}
              </section>
            </div>

            {/* Section 2 — Value Waterfall */}
            <PageSection
              title="Value Waterfall"
              subtitle="How projected value moves through the governance lifecycle."
            >
              <ValueWaterfall summary={summary} />
            </PageSection>

            {/* Section 3 — Outcome Pipeline */}
            <PageSection
              title="Outcome Pipeline"
              subtitle="Where outcomes are in the financial governance chain."
            >
              <div style={{ overflowX: 'auto' }}>
                <OutcomePipelineBoard records={records} onExpand={handleFocus} />
              </div>
            </PageSection>

            {/* Section 4 — Value Leakage */}
            <div data-testid="outcome-leakage-strip">
              <PageSection
                title="Value Leakage"
                subtitle="Where projected value has been lost through the lifecycle."
              >
                <LeakageBreakdown summary={summary} />
              </PageSection>
            </div>

            {/* Section 5 — Proof Timeline */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ marginBottom: 4 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: 0 }}>
                  Proof Timeline
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Click an outcome to expand its full evidence trail.
                </div>
              </div>
              {records.map(record => (
                <ProofTimeline key={record.id} record={record} events={events} />
              ))}
            </section>

            {/* Section 6 — Ledger Entries (Outcome Proof Authority) */}
            <PageSection
              title="Ledger Entries"
              subtitle="Outcome Proof Authority — canonical audit record for all outcomes."
            >
              <LedgerTable records={records} onFocus={handleFocus} />
            </PageSection>
          </>
        )}
      </div>
    </Shell>
  )
}
