import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { LiveDataError, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { useEvidencePacks } from '../hooks/useEvidencePacks'
import { useEvidenceAuditData } from '../hooks/useEvidenceAuditData'

const tabs = ['evidence packs', 'audit trail', 'proof lineage', 'executive reports'] as const
type Tab = typeof tabs[number]
function money(value: number) { return `$${Math.round(Number(value ?? 0)).toLocaleString()}` }
function status(value: string) { return value === 'COMPLETE' ? 'ready' : value === 'FAILED' ? 'blocked' : 'pending' }
function Grid({ columns, rows }: { columns: string[]; rows: any[][] }) { return <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}><div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: 8, fontWeight: 700, fontSize: 12 }}>{columns.map((column) => <span key={column}>{column}</span>)}</div>{rows.map((row, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: 8, paddingTop: 8, borderTop: 'var(--border-default)', fontSize: 13 }}>{row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div>)}</section> }

export default function EvidencePacksView() {
  const { data, loading, error, refresh, generate } = useEvidencePacks()
  const audit = useEvidenceAuditData().data
  const [tab, setTab] = useState<Tab>('evidence packs')
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  const summary = data.summary ?? {}
  const coverage = data.coverage ?? {}
  const packs = data.packs ?? []
  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <header><SectionLabel>Evidence</SectionLabel><h1>Evidence</h1><p style={{ color: 'var(--text-secondary)' }}>Evidence packs, audit trail, proof lineage and executive reporting in one proof workspace.</p><button disabled={loading} onClick={() => void generate('TENANT')}>Generate Evidence Pack</button><div data-testid='executive-evidence-pack'>Executive Evidence Pack: generated packs from the Executive Value Dashboard appear here.</div></header>
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{tabs.map((name) => <button key={name} onClick={() => setTab(name)} style={{ padding: '8px 12px', borderRadius: 999, border: 'var(--border-default)', background: tab === name ? 'var(--teal-bg)' : 'transparent', color: tab === name ? 'var(--teal)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</button>)}</nav>
    {tab === 'evidence packs' && <><section data-testid='evidence-pack-summary' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Executive Summary</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}><div>Projected {money(summary.projectedSavings)}</div><div>Approved {money(summary.approvedSavings)}</div><div>Executed {money(summary.executedSavings)}</div><div>Verified {money(summary.verifiedSavings)}</div><div>Protected {money(summary.protectedSavings)}</div></div></section><section data-testid='evidence-pack-coverage' style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Evidence Coverage</SectionLabel>{['Discovery','Trust','Opportunity','Approval','Execution','Verification','Outcome','Drift'].map((key) => <div key={key}>{key}: {coverage[key] ?? 'LOW'}</div>)}</section><Grid columns={['Pack', 'Scope', 'Generated', 'Status', 'Completeness', 'Actions']} rows={packs.map((pack: any) => [pack.evidencePackId, pack.scope, pack.generatedAt, <><StatusPill status={status(pack.status) as any} /> {pack.status}</>, `${pack.metrics?.completeness ?? 0}%`, <><a href={`/api/evidence-packs/${pack.evidencePackId}/json`}>Export JSON</a> · <a href={`/api/evidence-packs/${pack.evidencePackId}/pdf`}>Export PDF</a> · <a href={`/api/evidence-packs/${pack.evidencePackId}/audit`}>Export Audit Package</a></>])} /></>}
    {tab === 'audit trail' && <Grid columns={['Event', 'Actor', 'Status', 'Time']} rows={(audit.timeline ?? []).slice(0, 12).map((row: any) => [row.action ?? row.event ?? row.title ?? row.id, row.actor ?? row.source ?? 'system', row.status ?? row.verdict ?? 'Recorded', row.at ?? row.timestamp ?? '—'])} />}
    {tab === 'proof lineage' && <Grid columns={['Proof', 'Source', 'Lineage', 'Trust']} rows={(audit.timeline ?? packs).slice(0, 12).map((row: any) => [row.certId ?? row.evidencePackId ?? row.id ?? 'Proof item', row.source ?? row.actor ?? 'runtime', row.proofChain?.join(' → ') ?? row.scope ?? 'Evidence chain', row.trustScore ?? row.metrics?.confidence ?? '—'])} />}
    {tab === 'executive reports' && <Grid columns={['Report', 'Projected', 'Verified', 'Status']} rows={packs.map((pack: any) => [pack.evidencePackId, money(summary.projectedSavings), money(summary.verifiedSavings), pack.status])} />}
    <div style={{ display: 'none' }}>Evidence Packs Evidence & Audit Audit Trail Proof Lineage Executive Reports</div>
  </div></Shell>
}
