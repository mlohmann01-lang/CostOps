import React from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { MetricCard, SectionLabel } from '../components/shared/Foundation'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { useTenantReadinessData } from '../hooks/useTenantReadinessData'
import { formatPercent } from '../lib/display/formatters'
import { displayLabel } from '../lib/display/labels'
import { customerFacingError } from '../lib/display/errors'

function Badge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'teal' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : tone === 'teal' ? 'var(--teal)' : 'var(--green)'
  const bg = tone === 'red' ? 'var(--red-bg)' : tone === 'amber' ? 'var(--amber-bg)' : tone === 'teal' ? 'rgba(45,212,191,.08)' : 'var(--green-bg)'
  return <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 8px', fontSize: 11, color, background: bg, fontWeight: 700 }}>{label}</span>
}
function Card({ children }: { children: React.ReactNode }) { return <section style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>{children}</section> }

function connectorTone(status: string) { return status === 'CONNECTED' ? 'green' : status === 'ERROR' ? 'red' : 'amber' as const }
function discoveryTone(status: string) { return status === 'COMPLETE' ? 'green' : status === 'RUNNING' ? 'teal' : 'amber' as const }
function trustTone(status: string) { return status === 'READY' ? 'green' : status === 'BLOCKED' ? 'red' : 'amber' as const }
function recommendationTone(status: string) { return status === 'GENERATED' ? 'green' : 'amber' as const }
function executionTone(status: string) { return status === 'READY' ? 'green' : 'red' as const }

export default function TenantReadiness() {
  const data = useTenantReadinessData()
  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ display: 'grid', gap: 10 }}>
      <h1 style={{ margin: 0 }}>Tenant Readiness</h1>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Connector, discovery, trust, recommendation, and execution readiness toward a first verified outcome — sourced from existing onboarding and readiness services.</p>
      {data.dataState !== 'LIVE' && <DataStateBanner state={data.dataState} ctaLabel={data.dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={data.dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}
      {data.error && data.dataState !== 'NOT_CONNECTED' && <div role='alert' style={{ border: 'var(--border-amber)', background: 'var(--amber-bg)', borderRadius: 10, padding: 12 }}>{customerFacingError(data.error)}</div>}
      {data.loading && <div role='status'>Loading Tenant Readiness…</div>}
    </header>

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
      <Card><SectionLabel>Connector Status</SectionLabel><div style={{ marginTop: 8 }}><Badge label={displayLabel(data.connectorStatus)} tone={connectorTone(data.connectorStatus)} /></div></Card>
      <Card><SectionLabel>Discovery Status</SectionLabel><div style={{ marginTop: 8 }}><Badge label={displayLabel(data.discoveryStatus)} tone={discoveryTone(data.discoveryStatus)} /></div></Card>
      <Card><SectionLabel>Trust Status</SectionLabel><div style={{ marginTop: 8 }}><Badge label={displayLabel(data.trustStatus)} tone={trustTone(data.trustStatus)} /></div></Card>
      <Card><SectionLabel>Recommendation Status</SectionLabel><div style={{ marginTop: 8 }}><Badge label={displayLabel(data.recommendationStatus)} tone={recommendationTone(data.recommendationStatus)} /></div></Card>
      <Card><SectionLabel>Execution Readiness</SectionLabel><div style={{ marginTop: 8 }}><Badge label={displayLabel(data.executionReadiness)} tone={executionTone(data.executionReadiness)} /></div></Card>
    </section>

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: 10 }}>
      <MetricCard label='First Outcome Readiness' value={formatPercent(data.firstOutcomeReadinessPercent)} delta={data.requiredActions.length ? `${data.requiredActions.length} required action${data.requiredActions.length === 1 ? '' : 's'} remaining` : 'No blocking actions remaining'} hero />
    </section>

    <Card>
      <SectionLabel>Required Actions</SectionLabel>
      {data.requiredActions.length === 0 ? <p>No required actions. All onboarding blockers are clear.</p> : <ul>{data.requiredActions.map((action, index) => <li key={index}>{action}</li>)}</ul>}
    </Card>

    <Card>
      <SectionLabel>Next Actions</SectionLabel>
      {data.nextActions.length === 0 ? (data.firstOutcomeReadinessPercent === 100 ? <p>No next actions. Onboarding is complete.</p> : <p>No next actions are scheduled yet, but onboarding is not yet complete ({formatPercent(data.firstOutcomeReadinessPercent)} ready).</p>) : <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {data.nextActions.sort((a, b) => a.priority - b.priority).map((action) => <div key={action.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: 'var(--border-default)', borderRadius: 10, padding: '8px 12px' }}>
          <div><strong>{action.priority}. {action.label}</strong><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{action.status}</div></div>
          <Link href={action.href}>Go</Link>
        </div>)}
      </div>}
    </Card>

    <Card><SectionLabel>Cross Links</SectionLabel><div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
      <Link href='/connectors'>Connectors</Link>
      <Link href='/live-tenant-readiness'>Live Tenant Readiness</Link>
      <Link href='/actions'>Action Center</Link>
      <Link href='/outcomes'>Outcomes</Link>
    </div></Card>
  </div></Shell>
}
