import React, { useState, useEffect } from 'react'
import { Shell } from '../components/layout/Shell'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { ExecutiveHealthBar } from '../components/shared/ExecutiveHealthBar'
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
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${Math.round(v).toLocaleString()}`
}

function moneyFull(v: number | null | undefined): string {
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
  if (stageIndex(stage) > stageIndex(record.lifecycleStage)) return undefined
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
  if (s === 'VERIFIED' || s === 'FINANCE_CONFIRMED') return '#22C55E'
  if (s === 'PROTECTED') return '#16A34A'
  if (s === 'FAILED') return '#EF4444'
  if (s === 'DRIFTED') return '#EF9F27'
  return '#94A3B8'
}

const STAGE_LABELS: Record<string, string> = {
  PROJECTED: 'Projected', APPROVED: 'Approved', EXECUTED: 'Executed',
  VERIFIED: 'Verified', FINANCE_CONFIRMED: 'Finance Confirmed',
  PROTECTED: 'Protected', FAILED: 'Failed', DRIFTED: 'Drifted',
}

function evidenceTotal(record: OutcomeRecord): number {
  return record.approvalEvidenceIds.length + record.executionEvidenceIds.length +
    record.verificationEvidenceIds.length + record.financeEvidenceIds.length +
    record.protectionEvidenceIds.length
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function ProofBadge({ stage }: { stage: string }) {
  const color = stageColor(stage)
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      color, background: `${color}20`, border: `0.5px solid ${color}70`,
      borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {STAGE_LABELS[stage] ?? stage}
    </span>
  )
}

function StageDot({ stage }: { stage: string }) {
  const color = stageColor(stage)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 4px ${color}80` }} />
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{STAGE_LABELS[stage] ?? stage}</span>
    </span>
  )
}

function OwnerAvatar({ name }: { name: string | undefined }) {
  if (!name) return null
  const initials = name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
  const palette = ['#F5C451', '#22C55E', '#60CDFF', '#A78BFA', '#F472B6', '#34D399']
  const hue = palette[name.charCodeAt(0) % palette.length]!
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: `${hue}22`, border: `1px solid ${hue}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 900, color: hue, flexShrink: 0,
      letterSpacing: '-0.3px',
    }}>
      {initials}
    </div>
  )
}

function MiniConfBar({ score, width = 60 }: { score: number | undefined; width?: number }) {
  if (score == null) return <span style={{ color: '#94A3B8', fontSize: 11 }}>—</span>
  const pct = Math.round(score * 100)
  const color = score >= 0.85 ? '#22C55E' : score >= 0.70 ? '#F5C451' : '#EF9F27'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
    </div>
  )
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
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '22px 24px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}
    >
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', margin: 0 }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  )
}

// ─── Executive Summary strip ──────────────────────────────────────────────────

function ExecutiveSummaryStrip({ summary, isEmptyLive }: { summary: OutcomeLedgerSummary; isEmptyLive: boolean }) {
  if (isEmptyLive) {
    return (
      <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
          Connect Microsoft 365 or another supported platform to begin discovery.
        </div>
      </div>
    )
  }
  const leakPct = summary.totalProjectedValue > 0
    ? ((summary.totalValueLeakage / summary.totalProjectedValue) * 100).toFixed(1) : '0'
  const bottleneck = summary.financeBacklogCount > 0
    ? 'Finance Confirmation'
    : summary.verificationBacklogCount > 0
    ? 'Verification'
    : summary.protectionBacklogCount > 0
    ? 'Protection Sign-off'
    : null

  const parts = [
    `${summary.outcomeCount} outcome${summary.outcomeCount !== 1 ? 's' : ''} discovered`,
    summary.verifiedOutcomeCount > 0 ? `${summary.verifiedOutcomeCount} independently verified` : null,
    summary.financeConfirmedOutcomeCount > 0 ? `${summary.financeConfirmedOutcomeCount} finance confirmed` : null,
    summary.totalProtectedValue > 0 ? `${money(summary.totalProtectedValue)} currently protected` : null,
    Number(leakPct) > 0 ? `${leakPct}% value leakage` : null,
  ].filter(Boolean)

  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginRight: 12, whiteSpace: 'nowrap' }}>
        Executive Summary
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{part}</span>
            {i < parts.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 2px' }}>·</span>}
          </React.Fragment>
        ))}
        {bottleneck && (
          <>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 2px' }}>·</span>
            <span style={{ fontSize: 12, color: '#EF9F27', fontWeight: 700 }}>Next bottleneck: {bottleneck}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── SECTION 1 — Connected KPI Flow ──────────────────────────────────────────

function KpiFlowCard({
  label, value, sub, color,
}: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      flex: 1, background: 'var(--surface-0)',
      border: `1px solid ${color}30`,
      borderRadius: 14, padding: '18px 20px',
      boxShadow: `0 0 20px ${color}08`,
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1.5px', color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

function FlowArrow() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 6px', flexShrink: 0 }}>
      <div style={{ width: 1, height: 18, background: 'linear-gradient(180deg, #F5C451, #22C55E)' }} />
      <div style={{ fontSize: 8, color: '#22C55E', lineHeight: 1 }}>▼</div>
    </div>
  )
}

// ─── SECTION 2 — Value Waterfall ─────────────────────────────────────────────

const WATERFALL_STAGES: { key: keyof OutcomeLedgerSummary; label: string; color: string }[] = [
  { key: 'totalProjectedValue',       label: 'Projected',          color: '#F5C451' },
  { key: 'totalApprovedValue',        label: 'Approved',           color: '#F5C451' },
  { key: 'totalExecutedValue',        label: 'Executed',           color: '#60CDFF' },
  { key: 'totalVerifiedValue',        label: 'Verified',           color: '#22C55E' },
  { key: 'totalFinanceConfirmedValue', label: 'Finance Confirmed', color: '#22C55E' },
  { key: 'totalProtectedValue',       label: 'Protected',          color: '#16A34A' },
]

function ValueWaterfall({ summary }: { summary: OutcomeLedgerSummary }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const projected = summary.totalProjectedValue
  if (!projected) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
        No verified value available yet.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {WATERFALL_STAGES.map(({ key, label, color }, idx) => {
        const value = summary[key] as number
        const prev = idx > 0 ? (summary[WATERFALL_STAGES[idx - 1]!.key] as number) : projected
        const barPct = projected > 0 ? Math.max(0, Math.min(100, (value / projected) * 100)) : 0
        const delta = value - prev
        const retainedPct = prev > 0 ? Math.round((value / prev) * 100) : 100
        const hasValue = value > 0
        return (
          <div key={label}>
            {idx > 0 && delta < 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 2px 132px' }}>
                <div style={{ width: 1, height: 10, background: 'rgba(239,68,68,0.30)' }} />
                <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.75)', fontWeight: 700 }}>
                  ↓ {moneyFull(Math.abs(delta))} lost
                </span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 120, textAlign: 'right', fontSize: 12, fontWeight: 600, color: hasValue ? 'var(--text-primary)' : '#94A3B8', flexShrink: 0 }}>
                {label}
              </div>
              <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden' }}>
                {hasValue ? (
                  <div style={{
                    height: '100%',
                    width: mounted ? `${barPct}%` : '0%',
                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                    transition: `width 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 170}ms`,
                  }}>
                    {barPct > 18 && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: idx < 2 ? '#0A0E14' : '#0A1812' }}>
                        {Math.round(barPct)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>No verified value available yet.</span>
                  </div>
                )}
              </div>
              <div style={{ width: 130, flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: hasValue ? color : '#94A3B8' }}>
                  {hasValue ? moneyFull(value) : '—'}
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
  const evCount = evidenceTotal(record)
  const confPct = record.confidenceScore != null ? Math.round(record.confidenceScore * 100) : null
  return (
    <button
      onClick={onExpand}
      style={{
        width: '100%', textAlign: 'left',
        background: 'var(--surface-0)', border: '1px solid rgba(255,255,255,0.07)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 10, padding: '10px 11px',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{record.name}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color, letterSpacing: '-0.3px' }}>{money(primaryValue)}</div>

      {/* Confidence bar */}
      {record.confidenceScore != null && (
        <div>
          <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 2 }}>
            <div style={{ width: `${Math.round(record.confidenceScore * 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{confPct}% confidence</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <OwnerAvatar name={record.ownerName} />
        {record.ownerName && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{record.ownerName}</span>}
        <span style={{ fontSize: 10, color: evCount > 0 ? '#F5C451' : '#94A3B8', background: evCount > 0 ? 'rgba(245,196,81,0.07)' : 'rgba(255,255,255,0.03)', borderRadius: 999, padding: '1px 6px', border: `0.5px solid ${evCount > 0 ? 'rgba(245,196,81,0.25)' : 'rgba(255,255,255,0.06)'}` }}>
          {evCount} {evCount === 1 ? 'file' : 'files'}
        </span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 4px ${color}80` }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>
                {label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({colRecords.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {colRecords.map(r => (
                <OutcomePipelineCard key={r.id} record={r} onExpand={() => onExpand(r.id)} />
              ))}
              {colRecords.length === 0 && (
                <div style={{
                  height: 60, background: 'rgba(255,255,255,0.015)',
                  border: '1px dashed rgba(255,255,255,0.06)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)' }}>—</span>
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
  { key: 'totalApprovalLeakage',      label: 'Approval',      desc: 'Projected → Approved' },
  { key: 'totalExecutionLeakage',     label: 'Execution',     desc: 'Approved → Executed' },
  { key: 'totalVerificationLeakage',  label: 'Verification',  desc: 'Executed → Verified' },
  { key: 'totalFinanceLeakage',       label: 'Finance',       desc: 'Verified → Finance Confirmed' },
  { key: 'totalDriftLeakage',         label: 'Drift',         desc: 'Finance Confirmed → Protected' },
]

function LeakageBreakdown({ summary }: { summary: OutcomeLedgerSummary }) {
  const projected = summary.totalProjectedValue
  const maxLeakage = Math.max(...LEAKAGE_ROWS.map(r => summary[r.key] as number), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {LEAKAGE_ROWS.map(({ key, label, desc }) => {
        const lost = summary[key] as number
        const prevStageValue = projected // simplified; each bar relative to projected
        const retained = prevStageValue - lost
        const retainedPct = prevStageValue > 0 ? Math.round((retained / prevStageValue) * 100) : 100
        const barPct = maxLeakage > 0 ? (lost / maxLeakage) * 100 : 0
        const isHigh = projected > 0 && lost > projected * 0.10
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 100, flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: lost > 0 ? 'var(--text-primary)' : '#94A3B8' }}>{label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                {/* Protected portion */}
                <div style={{ position: 'absolute', inset: 0, width: `${retainedPct}%`, background: 'rgba(22,163,74,0.18)', borderRadius: 4 }} />
                {/* Lost portion bar overlay */}
                {lost > 0 && (
                  <div style={{
                    position: 'absolute', right: 0, top: 0, height: '100%',
                    width: `${100 - retainedPct}%`,
                    background: isHigh ? 'rgba(239,68,68,0.50)' : 'rgba(239,159,39,0.50)',
                    borderRadius: '0 4px 4px 0',
                  }} />
                )}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>{retainedPct}% retained</span>
                </div>
              </div>
            </div>
            <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: lost > 0 ? (isHigh ? '#EF4444' : '#EF9F27') : '#94A3B8' }}>
                {lost > 0 ? `↓ ${moneyFull(lost)}` : '—'}
              </div>
            </div>
          </div>
        )
      })}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Total Value Leakage</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: summary.totalValueLeakage > 0 ? '#EF9F27' : '#22C55E' }}>
          {summary.totalValueLeakage > 0 ? moneyFull(summary.totalValueLeakage) : '—'}
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
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 3, flexShrink: 0, boxShadow: `0 0 5px ${color}60` }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.09)', marginTop: 3 }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
            {entry.eventType.replace(/_/g, ' ')}
          </span>
          {entry.valueDelta !== undefined && entry.valueDelta !== 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: entry.valueDelta > 0 ? '#22C55E' : '#EF9F27' }}>
              {entry.valueDelta > 0 ? '+' : ''}{moneyFull(entry.valueDelta)}
            </span>
          )}
          {entry.stage && <ProofBadge stage={entry.stage} />}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
          {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {entry.actorName && <> · <span style={{ color: 'var(--text-secondary)' }}>{entry.actorName}</span></>}
          {entry.reason && <> · <em>{entry.reason}</em></>}
          {entry.evidenceIds.length > 0 && (
            <> · <span style={{ color: '#F5C451' }}>{entry.evidenceIds.length} evidence {entry.evidenceIds.length === 1 ? 'file' : 'files'}</span></>
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
  const evCount = evidenceTotal(record)
  return (
    <div
      data-testid={`outcome-timeline-${record.id}`}
      style={{
        background: 'var(--surface-1)',
        border: '1px solid rgba(255,255,255,0.07)',
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{record.name}</span>
            <ProofBadge stage={record.proofState} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color }}>{moneyFull(primaryValue)} retained</span>
            {record.confidenceScore != null && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Math.round(record.confidenceScore * 100)}% confidence</span>
            )}
            {evCount > 0 && (
              <span style={{ fontSize: 11, color: '#F5C451' }}>{evCount} evidence {evCount === 1 ? 'file' : 'files'}</span>
            )}
            {leakage.totalValueLeakage > 0 && (
              <span style={{ fontSize: 11, color: '#EF9F27' }}>↓ {moneyFull(leakage.totalValueLeakage)} leakage</span>
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>View Proof →</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeline.length} events</span>
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {timeline.length === 0 ? (
            <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>No proof events recorded.</div>
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
  const evCount = evidenceTotal(record)
  const cols = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr'
  return (
    <div
      data-testid={`ledger-row-${record.id}`}
      style={{ display: 'grid', gridTemplateColumns: cols, gap: 5, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '9px 0', fontSize: 12, alignItems: 'center' }}
    >
      <button onClick={onFocus} style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.3 }}>
        {record.name}
      </button>
      <span><StageDot stage={record.lifecycleStage} /></span>
      <span data-testid="col-projected" style={{ color: '#F5C451', fontWeight: 700 }}>{moneyFull(record.projectedValue)}</span>
      <span data-testid="col-approved" style={{ color: record.approvedValue != null ? 'var(--text-secondary)' : '#94A3B8' }}>{record.approvedValue != null ? moneyFull(record.approvedValue) : '—'}</span>
      <span data-testid="col-executed" style={{ color: record.executedValue != null ? 'var(--text-secondary)' : '#94A3B8' }}>{record.executedValue != null ? moneyFull(record.executedValue) : '—'}</span>
      <span data-testid="col-verified" style={{ color: record.verifiedValue != null ? '#22C55E' : '#94A3B8' }}>{record.verifiedValue != null ? moneyFull(record.verifiedValue) : '—'}</span>
      <span data-testid="col-finance-confirmed" style={{ color: record.financeConfirmedValue != null ? '#22C55E' : '#94A3B8' }}>{record.financeConfirmedValue != null ? moneyFull(record.financeConfirmedValue) : '—'}</span>
      <span data-testid="col-protected" style={{ color: record.protectedValue != null ? '#16A34A' : '#94A3B8', fontWeight: record.protectedValue != null ? 700 : 400 }}>{record.protectedValue != null ? moneyFull(record.protectedValue) : '—'}</span>
      <span data-testid="col-value-leakage" style={{ color: leakage.totalValueLeakage > 0 ? '#EF9F27' : '#94A3B8' }}>
        {leakage.totalValueLeakage > 0 ? moneyFull(leakage.totalValueLeakage) : '—'}
      </span>
      <MiniConfBar score={record.confidenceScore} width={52} />
      <span style={{ fontSize: 11, color: evCount > 0 ? '#F5C451' : '#94A3B8', fontWeight: evCount > 0 ? 700 : 400 }}>
        {evCount > 0 ? `${evCount} ${evCount === 1 ? 'file' : 'files'}` : '—'}
      </span>
      <span data-testid="col-proof-state"><StageDot stage={record.proofState} /></span>
    </div>
  )
}

function LedgerTable({
  records, onFocus,
}: { records: OutcomeRecord[]; onFocus: (id: string) => void }) {
  const cols = '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1.2fr 1fr 1fr'
  return (
    <div data-testid="outcome-proof-authority">
      {/* Outcome Proof Authority — canonical audit table */}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 5, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
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
        <div style={{ padding: '20px 0', fontSize: 13, color: '#94A3B8' }}>No ledger entries.</div>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyLedger({ dataState }: { dataState: string }) {
  return (
    <div data-testid="empty-ledger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <DataStateBanner state={dataState === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'NO_DATA'} />
      <div style={{ textAlign: 'center', padding: '48px 20px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>No Outcomes Yet</div>
        <div style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 420, lineHeight: 1.6 }}>
          Connect Microsoft 365 or another supported platform to begin building your Outcome Ledger.
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          ↓ Discovery will populate this board.
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
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Page header */}
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
            Outcome Ledger
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
            Financial chain of custody for every technology decision.
          </p>
        </div>

        {/* Executive Health Bar */}
        <ExecutiveHealthBar
          projectedValue={summary.totalProjectedValue}
          verifiedValue={summary.totalVerifiedValue}
          financeValue={summary.totalFinanceConfirmedValue}
          protectedValue={summary.totalProtectedValue}
          leakage={summary.totalValueLeakage}
          verificationBacklog={summary.verificationBacklogCount}
          isConnected={!isEmptyLive}
        />

        {/* Executive Summary strip */}
        <ExecutiveSummaryStrip summary={summary} isEmptyLive={isEmptyLive} />

        {dataState !== 'LIVE' && (
          <DataStateBanner
            state={dataState === 'DEMO' ? 'DEMO' : dataState === 'NOT_CONNECTED' ? 'NOT_CONNECTED' : 'SIMULATION'}
          />
        )}

        {isEmptyLive ? (
          <EmptyLedger dataState={dataState} />
        ) : (
          <>
            {/* Section 1 — Connected KPI Flow */}
            <section data-testid="outcome-summary-kpis" style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              <KpiFlowCard
                label="Projected Value"
                value={money(summary.totalProjectedValue)}
                sub={`${summary.outcomeCount} outcome${summary.outcomeCount !== 1 ? 's' : ''} tracked`}
                color="#F5C451"
              />
              <FlowArrow />
              <KpiFlowCard
                label="Verified Value"
                value={summary.totalVerifiedValue > 0 ? money(summary.totalVerifiedValue) : '—'}
                sub={`${summary.verifiedOutcomeCount} independently verified`}
                color="#22C55E"
              />
              <FlowArrow />
              <KpiFlowCard
                label="Finance Confirmed"
                value={summary.totalFinanceConfirmedValue > 0 ? money(summary.totalFinanceConfirmedValue) : '—'}
                sub={`${summary.financeConfirmedOutcomeCount} finance confirmed`}
                color="#22C55E"
              />
              <FlowArrow />
              <KpiFlowCard
                label="Protected Value"
                value={summary.totalProtectedValue > 0 ? money(summary.totalProtectedValue) : '—'}
                sub={`${summary.protectedOutcomeCount} protected`}
                color="#16A34A"
              />
            </section>

            {/* Secondary indicators */}
            <section data-testid="outcome-pipeline-health" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Value Leakage',          value: summary.totalValueLeakage > 0 ? money(summary.totalValueLeakage) : '—', color: summary.totalValueLeakage > 0 ? '#EF9F27' : '#22C55E' },
                { label: 'Verification Backlog',   value: String(summary.verificationBacklogCount), color: summary.verificationBacklogCount > 0 ? '#60CDFF' : '#94A3B8' },
                { label: 'Finance Backlog',        value: String(summary.financeBacklogCount), color: summary.financeBacklogCount > 0 ? '#EF9F27' : '#94A3B8' },
                { label: 'Drift',                  value: String(summary.driftedOutcomeCount), color: summary.driftedOutcomeCount > 0 ? '#EF4444' : '#94A3B8' },
                { label: 'Failed',                 value: String(summary.failedOutcomeCount), color: summary.failedOutcomeCount > 0 ? '#EF4444' : '#94A3B8' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 12px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color }}>{value}</span>
                </div>
              ))}
            </section>

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
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px', margin: 0 }}>
                  Proof Timeline
                </h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  Each outcome is a governed financial asset. Click to expand its chain of custody.
                </div>
              </div>
              {records.length === 0 && (
                <div style={{ padding: '20px', fontSize: 13, color: '#94A3B8', background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                  No proof events recorded.
                </div>
              )}
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
