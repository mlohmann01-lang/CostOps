import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, MetricCard, SectionLabel } from '../components/shared/Foundation'
import { useEvidenceAuditData } from '../hooks/useEvidenceAuditData'

export default function AuditLogPage() {
  const { data, isEmptyLive } = useEvidenceAuditData()
  const [certId, setCertId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  if (isEmptyLive) return <Shell><EmptyState title='No evidence timeline yet' description='Evidence & Audit will populate after governance events produce proof chains.' /></Shell>
  const selected = data.timeline.find((entry) => entry.certId === certId)

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform administration</SectionLabel><h1>Evidence & Audit</h1><p style={{ color: 'var(--text-secondary)' }}>Evidence-centric proof timeline with certificate traceability.</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}><MetricCard label='Governance events' value={String(data.stats.governanceEvents)} /><MetricCard label='Cert IDs issued' value={String(data.stats.certsIssued)} /><MetricCard label='Proof chains' value={String(data.stats.proofChains)} /><MetricCard label='Exports ready' value={String(data.stats.exportsReady)} /></div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{data.filters.map((filter) => <button key={filter}>{filter}</button>)}<button onClick={() => setNotice('Export placeholder download prepared')}>Export evidence pack</button>{notice && <span role='status' style={{ color: 'var(--teal)' }}>{notice}</span>}</div>
    <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }} data-testid='evidence-timeline'><SectionLabel>Evidence timeline</SectionLabel>{data.timeline.map((entry) => <div key={entry.id} style={{ padding: '12px 0', borderTop: 'var(--border-subtle)' }}><span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{entry.at}</span><h3>{entry.title}</h3><button style={{ fontFamily: 'monospace' }} onClick={() => setCertId(entry.certId)}>{entry.certId}</button><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Actor: {entry.actor}</div><div style={{ marginTop: 6 }}>Proof chain: {entry.proofChain.join(' → ')}</div></div>)}</section>
    {selected && <aside data-testid='cert-side-drawer' style={{ position: 'fixed', right: 20, top: 80, bottom: 80, width: 360, border: 'var(--border-teal)', borderRadius: 12, background: 'var(--bg-card)', padding: 16 }}><button onClick={() => setCertId(null)} style={{ float: 'right' }}>Close</button><SectionLabel>Cert ID side drawer</SectionLabel><h2>{selected.certId}</h2><p>{selected.title}</p><div>{selected.proofChain.map((step, index) => <div key={step}>{index + 1}. {step}</div>)}</div></aside>}
  </div></Shell>
}
