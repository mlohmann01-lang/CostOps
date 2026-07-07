import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip } from '../components/executive'
import { notAvailable, type EvidenceChain, type EvidenceRecord, type EvidenceRegistrySnapshot, type EvidenceRegistryState } from '../types/evidenceRegistry'
import { useEvidenceRegistry } from '../hooks/useEvidenceRegistry'

const domains = ['Microsoft 365', 'AI Platforms', 'SaaS', 'Cloud', 'ServiceNow', 'Finance']
const custodyStages = ['Collected', 'Validated', 'Linked', 'Retained', 'Redacted', 'Exported']
const val = (v: unknown) => v === undefined || v === null ? notAvailable : v
const pct = (v: unknown) => v === undefined || v === null ? notAvailable : `${Math.round(Number(v))}%`
const tone = (s: string) => /FAIL|BLOCK|MISSING|SECRET|RESTRICTED|PENDING|GAP/i.test(s) ? 'danger' : /PARTIAL|WARN|MEDIUM|EXPIR/i.test(s) ? 'warning' : /READY|VALIDATED|TRUSTED|PASS|DEMO|HIGH|COMPLETE/i.test(s) ? 'success' : 'info' as any
const isTrusted = (status: string) => /VALIDATED|TRUSTED|PASS|READY/i.test(status)
const isFailed = (status: string) => /FAIL|BLOCK/i.test(status)
const emptyTitle = 'No Evidence Yet'
const emptyDescription = 'Connect Microsoft 365 or another supported platform to begin collecting governed evidence.'

function domainFor(record: EvidenceRecord) {
  const haystack = `${record.title} ${record.evidenceRef} ${record.sourceSystem} ${record.targetType} ${record.targetId} ${record.evidenceType}`.toLowerCase()
  if (/m365|microsoft|entra|office|copilot/.test(haystack)) return 'Microsoft 365'
  if (/ai|openai|chatgpt|claude|copilot/.test(haystack)) return 'AI Platforms'
  if (/saas|slack|dropbox|salesforce|tableau|zoom|box/.test(haystack)) return 'SaaS'
  if (/aws|azure|gcp|cloud|snowflake/.test(haystack)) return 'Cloud'
  if (/servicenow|service now|ticket|change/.test(haystack)) return 'ServiceNow'
  if (/finance|invoice|erp|ledger|cost|approval/.test(haystack)) return 'Finance'
  return 'SaaS'
}

function coverageRows(records: EvidenceRecord[], isDemo: boolean) {
  if (!records.length && !isDemo) return []
  const grouped = new Map(domains.map((domain) => [domain, { domain, validated: 0, missing: 0, failed: 0, total: 0 }]))
  records.forEach((record) => {
    const row = grouped.get(domainFor(record)) ?? grouped.get('SaaS')!
    row.total += 1
    if (isTrusted(record.status)) row.validated += 1
    else if (isFailed(record.status)) row.failed += 1
    else row.missing += 1
  })
  return [...grouped.values()].map((row) => ({ ...row, coverage: row.total ? Math.round((row.validated / row.total) * 100) : 0 }))
}

function chainCounts(records: EvidenceRecord[], chain: EvidenceChain | null | undefined) {
  return {
    Collected: records.length,
    Validated: records.filter((record) => isTrusted(record.status)).length,
    Linked: chain?.links?.length ?? records.filter((record) => record.targetId).length,
    Retained: records.filter((record) => record.expiresAt).length,
    Redacted: records.filter((record) => /REDACT|NOT_REQUIRED/i.test(record.redactionStatus)).length,
    Exported: chain?.exports?.length ?? 0,
  } as Record<string, number>
}

function selectedChain(state: EvidenceRegistryState) {
  const first = state.records?.[0]
  return state.selectedChain ?? (first ? { record: first, artifacts: [], links: [], provenance: [], integrityChecks: [], lifecycleEvents: [], exports: [] } : null)
}

function trustScore(snapshot?: EvidenceRegistrySnapshot | null) {
  if (!snapshot) return undefined
  const coverage = Number(snapshot.evidenceCoverageScore ?? 0)
  const integrity = Number(snapshot.integrityScore ?? 0)
  const custody = Number(snapshot.provenanceScore ?? 0)
  return Math.round((coverage + integrity + custody) / 3)
}

export function renderEvidenceRegistryState(state: any) {
  const snapshot = state.snapshot as EvidenceRegistrySnapshot | null
  const records = (state.records ?? []) as EvidenceRecord[]
  const chain = selectedChain(state)
  return {
    title: 'Evidence Trust Center',
    subtitle: 'Can each claim be defended with source evidence and chain of custody? Integrity, provenance and audit readiness for every Certen claim.',
    demoBanner: state.isDemo ? 'Demo Mode Synthetic sample data. No production systems connected.' : '',
    liveEmpty: !state.isDemo && state.unavailable,
    emptyTitle,
    records: records.length,
    trustScore: snapshot ? `${trustScore(snapshot)}%` : notAvailable,
    auditReadiness: snapshot?.readiness ?? notAvailable,
    coverageRows: coverageRows(records, Boolean(state.isDemo)),
    custodyStages,
    gaps: snapshot?.criticalGaps ?? [],
    timelineEvents: [...(chain?.provenance ?? []), ...(chain?.integrityChecks ?? []), ...(chain?.lifecycleEvents ?? [])].length,
    auditChecklist: ['Retention', 'Redaction', 'Protected Evidence', 'Expiry Risk', 'Export Readiness'],
  }
}

function SectionEmpty({ title = emptyTitle, description = emptyDescription }: { title?: string; description?: string }) { return <EmptyState title={title} description={description} /> }

function TrustChain({ records, chain, inactive }: { records: EvidenceRecord[]; chain: EvidenceChain | null | undefined; inactive: boolean }) {
  const counts = chainCounts(records, chain)
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, alignItems: 'stretch' }}>{custodyStages.map((stage, index) => <div key={stage} style={{ border: 'var(--border-default)', background: inactive ? 'rgba(148,163,184,.08)' : 'rgba(245,158,11,.08)', borderRadius: 14, padding: 12, position: 'relative' }}><strong>{stage}</strong><p style={{ fontSize: 24, margin: '8px 0' }}>{inactive ? '—' : counts[stage]}</p><StatusChip label={inactive ? 'Inactive' : counts[stage] > 0 ? 'Trusted' : 'Pending'} tone={inactive ? 'neutral' as any : counts[stage] > 0 ? 'success' : 'warning'} />{index < custodyStages.length - 1 && <span aria-hidden='true' style={{ position: 'absolute', right: -10, top: '45%', color: 'var(--amber)' }}>→</span>}</div>)}</div>
}

function CoveragePanel({ rows }: { rows: ReturnType<typeof coverageRows> }) {
  return <div style={{ display: 'grid', gap: 10 }}>{rows.map((row) => <div key={row.domain} style={{ display: 'grid', gridTemplateColumns: '1.1fr .7fr 1.5fr 1.2fr', gap: 10, alignItems: 'center', borderTop: 'var(--border-subtle)', padding: '10px 0' }}><strong>{row.domain}</strong><span>{row.total ? `${row.coverage}% coverage` : notAvailable}</span><span>{row.validated} validated · {row.missing} missing · {row.failed} failed</span><div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,.18)', overflow: 'hidden' }}><div style={{ height: '100%', width: `${row.coverage}%`, background: row.failed ? 'var(--red)' : 'var(--green)' }} /></div></div>)}</div>
}

function ProofTimeline({ chain }: { chain: EvidenceChain | null | undefined }) {
  const events = [
    ...(chain?.provenance ?? []).map((event: any) => ({ type: event.eventType, time: event.occurredAt, actor: event.actor ?? event.sourceSystem ?? 'Source system', target: event.targetId ?? chain?.record?.targetId, status: 'Chain of Custody', count: chain?.artifacts?.length ?? 0 })),
    ...(chain?.integrityChecks ?? []).map((event: any) => ({ type: event.checkType, time: event.checkedAt, actor: event.sourceSystem ?? 'Integrity service', target: chain?.record?.targetId, status: event.status, count: chain?.artifacts?.length ?? 0 })),
    ...(chain?.lifecycleEvents ?? []).map((event: any) => ({ type: event.toStatus, time: event.occurredAt, actor: event.actor ?? 'Evidence registry', target: chain?.record?.targetId, status: event.toStatus, count: chain?.artifacts?.length ?? 0 })),
  ]
  if (!events.length) return <SectionEmpty title='No proof timeline yet.' description='Collected provenance, integrity checks, and lifecycle events will appear here.' />
  return <div style={{ display: 'grid', gap: 8 }}>{events.map((event, index) => <div key={`${event.type}-${index}`} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 10 }}><div style={{ display: 'grid', justifyItems: 'center' }}><span style={{ width: 14, height: 14, borderRadius: 999, background: 'var(--amber)', marginTop: 4 }} />{index < events.length - 1 && <span style={{ width: 2, minHeight: 36, background: 'rgba(245,158,11,.45)' }} />}</div><div style={{ border: 'var(--border-default)', borderRadius: 12, padding: 10 }}><strong>{event.type}</strong><p style={{ margin: '4px 0', color: 'var(--text-secondary)' }}>{event.time ? new Date(event.time).toLocaleString() : notAvailable}</p><p style={{ margin: 0 }}>Actor/source: {event.actor} · Target: {event.target ?? notAvailable} · Integrity: {event.status ?? notAvailable} · Artifacts: {event.count}</p></div></div>)}</div>
}

function AuditReadinessPanel({ snapshot, chain }: { snapshot?: EvidenceRegistrySnapshot | null; chain: EvidenceChain | null | undefined }) {
  if (!snapshot) return <SectionEmpty title='Audit readiness unavailable.' description='Connect a governed source to calculate retention, redaction, protected evidence, expiry risk and export readiness.' />
  const items = [
    ['Retention', snapshot.expiredCount > 0 ? `${snapshot.expiredCount} expired` : 'Ready'],
    ['Redaction', snapshot.redactionPendingCount > 0 ? `${snapshot.redactionPendingCount} pending` : 'Ready'],
    ['Protected Evidence', `${snapshot.restrictedCount} protected`],
    ['Expiry Risk', snapshot.expiredCount > 0 ? `${snapshot.expiredCount} expired` : 'None approaching'],
    ['Export Readiness', (chain?.exports?.length ?? 0) > 0 || snapshot.readiness === 'READY' ? 'Ready' : 'Pending'],
  ]
  return <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}><div><strong style={{ fontSize: 28 }}>{snapshot.readiness}</strong><p style={{ color: 'var(--text-secondary)' }}>Overall status</p></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>{items.map(([label, status]) => <div key={label} style={{ border: 'var(--border-default)', borderRadius: 12, padding: 10 }}><strong>{label}</strong><p><StatusChip label={status} tone={tone(status)} /></p></div>)}</div></div>
}

export default function EvidenceRegistry() {
  const state = useEvidenceRegistry()
  const s = state.snapshot
  const rows = state.records ?? []
  const chain = selectedChain(state)
  const liveEmpty = !state.isDemo && state.unavailable
  const coverage = liveEmpty ? [] : coverageRows(rows, state.isDemo)
  return <Shell><main style={{ padding: '24px clamp(18px,3vw,34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto' }}>
    <ExecutivePageHeader title='Evidence Trust Center' subtitle='Can each claim be defended with source evidence and chain of custody? Integrity, provenance and audit readiness for every Certen claim.' chips={[{ label: state.isDemo ? 'Demo Mode' : 'Live Mode', tone: state.isDemo ? 'info' : 'warning' }, { label: `Audit readiness: ${s?.readiness ?? notAvailable}`, tone: tone(s?.readiness ?? 'MISSING') }, { label: `Last updated: ${s?.generatedAt ? new Date(s.generatedAt).toLocaleString() : notAvailable}`, tone: 'info' }]} />
    {state.isDemo && <div data-testid='demo-evidence-banner' style={{ border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.08)', borderRadius: 14, padding: 12 }}><strong>Demo Mode</strong><p style={{ margin: '4px 0 0' }}>Synthetic sample data. No production systems connected.</p></div>}

    <section data-testid='evidence-trust-hero' style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(170px,1fr))', gap: 12 }}>
      {liveEmpty ? [['Trust Score', notAvailable], ['Audit Readiness', notAvailable], ['Evidence Coverage', notAvailable], ['Integrity Health', notAvailable]].map(([label, value]) => <MetricCard key={label} label={label} value={value} description='Unavailable until evidence is collected.' tone='neutral' />) : <>
        <MetricCard label='Trust Score' value={pct(trustScore(s))} description='Coverage, integrity and chain of custody combined.' tone='warning' />
        <MetricCard label='Audit Readiness' value={String(val(s?.readiness))} description='Could we defend this in an audit?' tone={tone(s?.readiness ?? '')} />
        <MetricCard label='Evidence Coverage' value={pct(s?.evidenceCoverageScore)} description={`${String(val(s?.validatedCount))} trusted / validated assets.`} tone='success' />
        <MetricCard label='Integrity Health' value={pct(s?.integrityScore)} description={`${val(s?.failedCount)} integrity failures.`} tone={Number(s?.failedCount ?? 0) > 0 ? 'danger' : 'success'} />
      </>}
    </section>

    {liveEmpty && <SectionEmpty />}

    <ExecutiveSection testId='evidence-trust-chain' title='Trust Chain' description='Collected → Validated → Linked → Retained → Redacted → Exported chain of custody.'><TrustChain records={rows} chain={chain} inactive={liveEmpty} /></ExecutiveSection>

    <ExecutiveSection testId='evidence-domain-coverage' title='Evidence Coverage by Domain' description='Coverage gaps by source domain and claim area.'>{coverage.length ? <CoveragePanel rows={coverage} /> : <SectionEmpty />}</ExecutiveSection>

    <ExecutiveSection testId='evidence-gaps' title='Evidence Gaps' description='Decisions blocked by missing, failed or incomplete evidence.'>{liveEmpty ? <SectionEmpty title='No evidence gaps yet.' description='Connect a source to begin evidence validation.' /> : (s?.criticalGaps?.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>{s.criticalGaps.map((gap, index) => <div key={`${gap.targetType}-${gap.targetId}-${index}`} style={{ border: 'var(--border-default)', borderRadius: 12, padding: 12 }}><strong>{gap.targetId}</strong><p>Severity: <StatusChip label={gap.severity} tone={tone(gap.severity)} /></p><p>Blocked stage: Verification</p><p>Missing evidence: {gap.reason}</p><p>Recommended action: Connect or validate the required source evidence.</p></div>)}</div> : <SectionEmpty title='No evidence gaps yet.' description='Collected evidence currently has no critical gaps.' />)}</ExecutiveSection>

    <ExecutiveSection testId='proof-timeline' title='Proof Timeline' description='Visual provenance, integrity and lifecycle events for the selected evidence asset.'>{liveEmpty ? <SectionEmpty /> : <ProofTimeline chain={chain} />}</ExecutiveSection>

    <ExecutiveSection testId='audit-readiness' title='Audit Readiness' description='Retention, redaction, protected evidence, expiry risk and export readiness.'>{liveEmpty ? <SectionEmpty title='Audit readiness unavailable.' description={emptyDescription} /> : <AuditReadinessPanel snapshot={s} chain={chain} />}</ExecutiveSection>

    <ExecutiveSection testId='evidence-assets' title='Evidence Assets' description='Evidence · Type · Source · Target · Status · Trust · Classification · Integrity · Redaction · Expires'>{rows.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Evidence', 'Type', 'Source', 'Target', 'Status', 'Trust', 'Classification', 'Integrity', 'Redaction', 'Expires'].map((h) => <th key={h} style={{ textAlign: 'left', padding: 8 }}>{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.title}</td><td>{r.evidenceType}</td><td>{r.sourceSystem}</td><td>{r.targetType}:{r.targetId}</td><td><StatusChip label={r.status} tone={tone(r.status)} /></td><td>{r.trustLevel}</td><td>{r.classification}</td><td>{String(r.metadata?.integrity ?? notAvailable)}</td><td>{r.redactionStatus}</td><td>{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : notAvailable}</td></tr>)}</tbody></table></div> : <SectionEmpty />}</ExecutiveSection>
  </main></Shell>
}
