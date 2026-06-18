import React from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { SectionLabel } from '../components/shared/Foundation'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useFirstOutcomeJourney, type JourneyStep } from '../hooks/useFirstOutcomeJourney'

function StepBadge({ status }: { status: JourneyStep['status'] }) {
  const tone = status === 'COMPLETE' ? { fg: 'var(--green)', bg: 'var(--green-bg)' } : status === 'IN_PROGRESS' ? { fg: 'var(--amber)', bg: 'var(--amber-bg)' } : { fg: 'var(--text-secondary)', bg: 'rgba(255,255,255,.04)' }
  const label = status === 'COMPLETE' ? 'Complete' : status === 'IN_PROGRESS' ? 'In Progress' : 'Not Started'
  return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg }}>{label}</span>
}

export default function FirstOutcomeJourney() {
  const data = useFirstOutcomeJourney()
  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ display: 'grid', gap: 10 }}>
      <h1 style={{ margin: 0 }}>Get Your First Verified Outcome</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Connect M365, run discovery, review recommendations, select and approve an action, execute it, verify the result, and view the recorded outcome.</p>
      {data.dataState !== 'LIVE' && <DataStateBanner state={data.dataState} ctaLabel={data.dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={data.dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}
      {data.loading && <div role='status'>Loading journey status…</div>}
    </header>

    {data.achieved && data.achievedDetail && (
      <section data-testid='first-outcome-achieved' style={{ border: 'var(--border-teal)', background: 'rgba(45,212,191,.08)', borderRadius: 14, padding: 18 }}>
        <SectionLabel>First Verified Outcome Achieved</SectionLabel>
        <h2 style={{ margin: '8px 0' }}>{data.achievedDetail.actionTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginTop: 10 }}>
          <div><div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}>Recommendation</div><div>{data.achievedDetail.recommendationId}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}>Verified Savings</div><div>${data.achievedDetail.verifiedSavings.toLocaleString()}</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}>Execution Timestamp</div><div>{data.achievedDetail.executedAt ?? '—'}</div></div>
        </div>
      </section>
    )}

    <section style={{ display: 'grid', gap: 10 }}>
      {data.steps.map((step, index) => (
        <div key={step.id} data-testid={`journey-step-${step.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-label)' }}>{index + 1}</span>
            <strong>{step.label}</strong>
            <StepBadge status={step.status} />
          </div>
          <Link href={step.href}>Go</Link>
        </div>
      ))}
    </section>
  </div></Shell>
}
