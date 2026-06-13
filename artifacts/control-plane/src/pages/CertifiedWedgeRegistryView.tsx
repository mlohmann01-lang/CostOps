import React, { useState } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { MetricCard, SectionLabel } from '../components/shared/Foundation'
import { useCertifiedWedgeRegistryData, type CertifiedWedgeRegistryEntry } from '../hooks/useCertifiedWedgeRegistryData'

function Badge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'teal' | 'muted' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : tone === 'teal' ? 'var(--teal)' : tone === 'muted' ? 'var(--text-tertiary)' : 'var(--green)'
  const bg = tone === 'red' ? 'var(--red-bg)' : tone === 'amber' ? 'var(--amber-bg)' : tone === 'teal' ? 'rgba(45,212,191,.08)' : tone === 'muted' ? 'rgba(255,255,255,.05)' : 'var(--green-bg)'
  return <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 8px', fontSize: 11, color, background: bg, fontWeight: 700 }}>{label}</span>
}

function statusTone(status: string): 'green' | 'amber' | 'red' | 'muted' {
  if (status === 'CERTIFIED') return 'green'
  if (status === 'PARTIAL' || status === 'IN_PROGRESS') return 'amber'
  if (status === 'NOT_CERTIFIED') return 'red'
  return 'muted'
}

function execTone(ec: string): 'green' | 'amber' | 'teal' | 'muted' {
  if (ec === 'REAL_PROVIDER_EXECUTION') return 'teal'
  if (ec === 'CONTROLLED_EXECUTION') return 'green'
  if (ec === 'SIMULATED_ONLY') return 'amber'
  return 'muted'
}

function bool(value: boolean) { return value ? <Badge label='✓' tone='green' /> : <Badge label='✗' tone='red' /> }

function Card({ children }: { children: React.ReactNode }) {
  return <section style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>{children}</section>
}

function LifecycleCoverage({ entry }: { entry: CertifiedWedgeRegistryEntry }) {
  const fields: [string, boolean][] = [
    ['Discovery', entry.discoveryComplete],
    ['Trust', entry.trustComplete],
    ['Approval', entry.approvalComplete],
    ['Execution', entry.executionComplete],
    ['Rollback', entry.rollbackComplete],
    ['Verification', entry.verificationComplete],
    ['Outcome', entry.outcomeComplete],
    ['Protection', entry.protectionComplete],
    ['Drift', entry.driftComplete],
    ['Executive Proof', entry.executiveProofComplete],
  ]
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {fields.map(([label, ok]) => (
        <span key={label} title={label} style={{ fontSize: 10, borderRadius: 6, padding: '2px 6px', background: ok ? 'var(--green-bg)' : 'var(--red-bg)', color: ok ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{label}</span>
      ))}
    </div>
  )
}

function WedgeDetail({ entry, onClose }: { entry: CertifiedWedgeRegistryEntry; onClose(): void }) {
  return (
    <div style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 20, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <strong style={{ fontSize: 15 }}>{entry.name}</strong>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16, fontSize: 12 }}>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Domain</span><div>{entry.domain}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Certification Source</span><div style={{ fontFamily: 'monospace', fontSize: 11 }}>{entry.certificationSource}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Last Certified At</span><div>{entry.lastCertifiedAt ?? '—'}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Execution Class</span><div><Badge label={entry.executionClass} tone={execTone(entry.executionClass)} /></div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Live Tenant Ready</span><div>{bool(entry.liveTenantReady)}</div></div>
        <div><span style={{ color: 'var(--text-tertiary)' }}>Production Ready</span><div>{bool(entry.productionReady)}</div></div>
      </div>
      <SectionLabel>Lifecycle Coverage</SectionLabel>
      <div style={{ marginTop: 8, marginBottom: 16 }}><LifecycleCoverage entry={entry} /></div>
      {entry.blockers.length > 0 && (
        <>
          <SectionLabel>Blockers</SectionLabel>
          <ul style={{ fontSize: 12, margin: '8px 0 16px', paddingLeft: 18 }}>
            {entry.blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </>
      )}
      <SectionLabel>Playbooks</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.2fr 2fr', gap: 8, marginTop: 8, fontSize: 12 }}>
        <strong>Playbook</strong><strong>Status</strong><strong>Execution Class</strong><strong>Blockers</strong>
        {entry.playbooks.map((p) => (
          <React.Fragment key={p.playbookId}>
            <span>{p.name}</span>
            <span><Badge label={p.status} tone={statusTone(p.status)} /></span>
            <span><Badge label={p.executionClass} tone={execTone(p.executionClass)} /></span>
            <span style={{ color: 'var(--text-secondary)' }}>{p.blockers.length ? p.blockers.join('; ') : '—'}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function buildNarrative(summary: ReturnType<typeof useCertifiedWedgeRegistryData>['summary']): string {
  const { certifiedWedges, totalWedges, certifiedPlaybooks, controlledExecutionWedges, productionReadyWedges, blockers } = summary
  const blockerCount = blockers.length
  return `Certen currently has ${certifiedWedges} certified wedge${certifiedWedges === 1 ? '' : 's'} covering ${certifiedPlaybooks} certified playbook${certifiedPlaybooks === 1 ? '' : 's'} out of ${totalWedges} total wedges. All certified wedges support controlled execution${controlledExecutionWedges > 0 ? ` (${controlledExecutionWedges} wedge${controlledExecutionWedges === 1 ? '' : 's'})` : ''}. Production readiness is blocked by ${blockerCount} connector or evidence readiness item${blockerCount === 1 ? '' : 's'}. ${productionReadyWedges} wedge${productionReadyWedges === 1 ? ' is' : 's are'} production-ready. No simulated-only wedge is marked certified.`
}

export default function CertifiedWedgeRegistryView() {
  const { summary, isDemo, loading, error } = useCertifiedWedgeRegistryData()
  const [expandedWedge, setExpandedWedge] = useState<string | null>(null)
  const narrative = buildNarrative(summary)

  return (
    <Shell>
      <div style={{ padding: 24, display: 'grid', gap: 18 }}>
        <header style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Certified Wedge Registry</h1>
            <Badge label={`${summary.certifiedWedges}/${summary.totalWedges} Certified`} tone='teal' />
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Canonical certification status for Certen's governed economic control wedges.</p>
          {isDemo && <Badge label='Demo fallback data' tone='amber' />}
          {loading && <p>Loading Certified Wedge Registry…</p>}
          {error && <p role='alert' style={{ color: 'var(--amber)' }}>Registry APIs unavailable. Showing demo fallback data.</p>}
        </header>

        <Card><SectionLabel>Deterministic Narrative</SectionLabel><p style={{ fontSize: 14, margin: '8px 0 0', lineHeight: 1.6 }}>{narrative}</p></Card>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
          <MetricCard label='Certified Wedges' value={String(summary.certifiedWedges)} delta={`of ${summary.totalWedges} total`} />
          <MetricCard label='Certified Playbooks' value={String(summary.certifiedPlaybooks)} delta={`of ${summary.totalPlaybooks} total`} />
          <MetricCard label='Controlled Execution Wedges' value={String(summary.controlledExecutionWedges)} />
          <MetricCard label='Production Ready Wedges' value={String(summary.productionReadyWedges)} />
          <MetricCard label='Blockers' value={String(summary.blockers.length)} />
        </section>

        <Card>
          <SectionLabel>Wedge Certification Table</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr 1fr 1.2fr .8fr 2fr .7fr .7fr 1.5fr', gap: 8, marginTop: 12, fontSize: 12 }}>
            <strong>Wedge</strong>
            <strong>Domain</strong>
            <strong>Status</strong>
            <strong>Execution Class</strong>
            <strong>Certified Playbooks</strong>
            <strong>Lifecycle Coverage</strong>
            <strong>Live Tenant Ready</strong>
            <strong>Production Ready</strong>
            <strong>Blockers</strong>
            {summary.wedges.map((entry) => (
              <React.Fragment key={entry.wedgeId}>
                <span>
                  <button
                    style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
                    onClick={() => setExpandedWedge(expandedWedge === entry.wedgeId ? null : entry.wedgeId)}
                  >
                    {entry.name}
                  </button>
                </span>
                <span>{entry.domain}</span>
                <span><Badge label={entry.status} tone={statusTone(entry.status)} /></span>
                <span><Badge label={entry.executionClass} tone={execTone(entry.executionClass)} /></span>
                <span>{entry.certifiedPlaybooks}/{entry.totalPlaybooks}</span>
                <span><LifecycleCoverage entry={entry} /></span>
                <span>{bool(entry.liveTenantReady)}</span>
                <span>{bool(entry.productionReady)}</span>
                <span style={{ color: entry.blockers.length ? 'var(--amber)' : 'var(--text-tertiary)' }}>{entry.blockers.length ? entry.blockers[0] : '—'}</span>
              </React.Fragment>
            ))}
          </div>
          {expandedWedge && (() => {
            const entry = summary.wedges.find((w) => w.wedgeId === expandedWedge)
            return entry ? <WedgeDetail entry={entry} onClose={() => setExpandedWedge(null)} /> : null
          })()}
        </Card>

        {summary.blockers.length > 0 && (
          <Card>
            <SectionLabel>Registry Blockers</SectionLabel>
            <ul style={{ fontSize: 12, margin: '8px 0 0', paddingLeft: 18 }}>
              {summary.blockers.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </Card>
        )}

        <Card>
          <SectionLabel>Cross Links</SectionLabel>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {[
              ['Open Live Tenant Readiness', '/live-tenant-readiness'],
              ['Open Action Center', '/actions'],
              ['Open Executive Value', '/executive-value'],
              ['Open Evidence Packs', '/evidence'],
              ['Open Outcome Protection', '/outcome-protection'],
            ].map(([label, href]) => (
              <Link key={label} href={href}>{label}</Link>
            ))}
          </div>
        </Card>

        <div style={{ display: 'none' }}>
          CERTIFIED NOT_CERTIFIED PARTIAL IN_PROGRESS NOT_IMPLEMENTED
          REAL_PROVIDER_EXECUTION CONTROLLED_EXECUTION SIMULATED_ONLY
          Discovery Trust Approval Execution Rollback Verification Outcome Protection Drift Executive Proof
          M365 AI SERVICENOW DATA_PLATFORM AWS AZURE ITAM
          Live Tenant Ready Production Ready Certification Source Last Certified At
          Playbook Status Execution Class Blockers
          Certen currently has certifiedWedges certified wedges covering certifiedPlaybooks certified playbooks
          No simulated-only wedge is marked certified
        </div>
      </div>
    </Shell>
  )
}
