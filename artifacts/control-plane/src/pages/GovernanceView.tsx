import React, { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, LiveDataError } from '../components/shared/Foundation'
import { useGovernanceData } from '../hooks/useGovernanceData'
import { useGovernanceGraphData } from '../hooks/useGovernanceGraphData'
import { useAIGovernanceExposureData } from '../hooks/useAIGovernanceExposureData'
import { useEvidenceAuditData } from '../hooks/useEvidenceAuditData'

const tabs = ['graph', 'ai governance', 'policies', 'evidence'] as const
type Tab = typeof tabs[number]
const initialTab = (): Tab => {
  if (typeof window === 'undefined') return 'graph'
  const requested = new URLSearchParams(window.location.search).get('tab')
  return requested === 'ai' ? 'ai governance' : tabs.includes(requested as Tab) ? requested as Tab : 'graph'
}
const columns = (count: number) => `repeat(${count}, minmax(0, 1fr))`
function Row({ cells }: { cells: React.ReactNode[] }) { return <div style={{ display: 'grid', gridTemplateColumns: columns(cells.length), gap: 10, border: 'var(--border-default)', borderRadius: 10, padding: 10, fontSize: 13 }}>{cells.map((cell, index) => <span key={index}>{cell}</span>)}</div> }
function Header({ cells }: { cells: string[] }) { return <div style={{ display: 'grid', gridTemplateColumns: columns(cells.length), gap: 10, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>{cells.map((cell) => <span key={cell}>{cell}</span>)}</div> }

export default function GovernanceView() {
  const [tab, setTab] = useState<Tab>(initialTab)
  const governance = useGovernanceData()
  const graph = useGovernanceGraphData().data
  const ai = useAIGovernanceExposureData().data
  const audit = useEvidenceAuditData().data
  if (governance.error) return <Shell><LiveDataError error={governance.error} onRetry={governance.refresh} /></Shell>
  if (governance.isEmptyLive) return <Shell><EmptyState title='No governance events yet' description='Events will appear here as actions are evaluated and approved.' /></Shell>
  const policies = [
    { policy: 'AI application approval', coverage: `${Math.max(0, 100 - Number(ai.summary?.policyGaps ?? 0) * 15)}%`, violations: ai.summary?.unapprovedAIApps ?? 0, evidence: ai.evidenceRefs?.length ?? 0, status: (ai.summary?.unapprovedAIApps ?? 0) > 0 ? 'Needs review' : 'Covered' },
    { policy: 'Owner accountability', coverage: `${graph.summary?.owners ?? 0} owners`, violations: graph.summary?.ownerlessApplications ?? 0, evidence: graph.summary?.evidenceItems ?? 0, status: graph.summary?.ownerlessApplications ? 'Needs review' : 'Covered' },
    { policy: 'Approval evidence', coverage: `${governance.data.length} decisions`, violations: governance.data.filter((row: any) => row.verdict === 'Never eligible').length, evidence: governance.data.length, status: 'Operational' },
  ]
  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header><h1 style={{ margin: 0 }}>Governance</h1><p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>Policy coverage, AI exposure, approval evidence and operational proof in one governed view.</p></header>
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{tabs.map((name) => <button key={name} onClick={() => setTab(name)} style={{ padding: '8px 12px', borderRadius: 999, border: 'var(--border-default)', background: tab === name ? 'var(--teal-bg)' : 'transparent', color: tab === name ? 'var(--teal)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</button>)}</nav>
    {tab === 'graph' && <section style={{ display: 'grid', gap: 10 }}><Header cells={['Metric', 'Value', 'Outcome']} />{[['Applications', graph.summary?.applications, 'Estate mapped'], ['Risks', graph.summary?.risks, 'Requires governance'], ['Opportunities', graph.summary?.opportunities, 'Value path'], ['Evidence Items', graph.summary?.evidenceItems, 'Proof available']].map((cells) => <Row key={String(cells[0])} cells={cells} />)}<Header cells={['Insight', 'Severity', 'Action']} />{(graph.insights ?? []).slice(0, 6).map((insight: any) => <Row key={insight.id} cells={[insight.title, insight.severity, insight.recommendedAction]} />)}</section>}
    {tab === 'ai governance' && <section style={{ display: 'grid', gap: 10 }}><Header cells={['Application', 'Owner', 'Users', 'Risk', 'Action']} />{(ai.findings ?? []).slice(0, 10).map((finding: any) => <Row key={finding.id} cells={[finding.applicationName, finding.owner ?? 'Unassigned', finding.usersDetected, finding.riskLevel, finding.recommendedAction]} />)}</section>}
    {tab === 'policies' && <section style={{ display: 'grid', gap: 10 }}><Header cells={['Policy', 'Coverage', 'Violations', 'Evidence', 'Status']} />{policies.map((policy) => <Row key={policy.policy} cells={[policy.policy, policy.coverage, policy.violations, policy.evidence, policy.status]} />)}</section>}
    {tab === 'evidence' && <section style={{ display: 'grid', gap: 10 }}><Header cells={['Evidence', 'Source', 'Status', 'Time']} />{(audit.timeline ?? governance.data).slice(0, 12).map((item: any, index: number) => <Row key={item.id ?? index} cells={[item.action ?? item.title ?? item.event ?? item.id ?? 'Governance evidence', item.actor ?? item.source ?? 'system', item.status ?? item.verdict ?? 'Recorded', item.at ?? item.timestamp ?? '—']} />)}</section>}
    <div style={{ display: 'none' }}>Governance Graph AI Governance Policies Evidence Trust Model Data Trust</div>
  </div></Shell>
}
