import React from 'react'
import { Shell } from '../components/layout/Shell'
import { MetricCard, SectionLabel } from '../components/shared/Foundation'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useOutcomeProofData } from '../hooks/useOutcomeProofData'

function firstOutcomeStatus(executed: number, verified: number): 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' {
  if (verified > 0) return 'ACHIEVED'
  if (executed > 0) return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

export default function ExecutiveOutcomeDashboard() {
  const { data, dataState, loading, error } = useOutcomeProofData()
  const summary = data?.proofSummary ?? { projectedMonthlySavings: 0, executedMonthlySavings: 0, verifiedMonthlySavings: 0, protectedMonthlySavings: 0 }
  const status = firstOutcomeStatus(summary.executedMonthlySavings, summary.verifiedMonthlySavings)
  const statusLabel = status === 'ACHIEVED' ? 'Achieved' : status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'
  const statusTone = status === 'ACHIEVED' ? { fg: 'var(--green)', bg: 'var(--green-bg)' } : status === 'IN_PROGRESS' ? { fg: 'var(--amber)', bg: 'var(--amber-bg)' } : { fg: 'var(--text-secondary)', bg: 'rgba(255,255,255,.04)' }

  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ display: 'grid', gap: 10 }}>
      <h1 style={{ margin: 0 }}>Executive Outcome Dashboard</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Savings identified, executed, verified, and protected — sourced directly from the outcome ledger.</p>
      {dataState && dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}
      {error && dataState !== 'NOT_CONNECTED' && <div role='alert' style={{ border: 'var(--border-amber)', background: 'var(--amber-bg)', borderRadius: 10, padding: 12 }}>Outcome data is unavailable: {error}</div>}
      {loading && <div role='status'>Loading executive outcome dashboard…</div>}
    </header>

    <section data-testid='executive-outcome-summary' style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
      <MetricCard label='Savings Identified' value={`$${summary.projectedMonthlySavings.toLocaleString()}`} />
      <MetricCard label='Savings Executed' value={`$${summary.executedMonthlySavings.toLocaleString()}`} />
      <MetricCard label='Savings Verified' value={`$${summary.verifiedMonthlySavings.toLocaleString()}`} hero />
      <MetricCard label='Savings Protected' value={`$${summary.protectedMonthlySavings.toLocaleString()}`} />
    </section>

    <section style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>
      <SectionLabel>First Outcome Status</SectionLabel>
      <div style={{ marginTop: 10 }}><span style={{ fontSize: 13, padding: '4px 10px', borderRadius: 999, background: statusTone.bg, color: statusTone.fg }}>{statusLabel}</span></div>
    </section>
  </div></Shell>
}
