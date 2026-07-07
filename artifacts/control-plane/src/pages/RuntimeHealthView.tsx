import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, MetricCard, SectionLabel, StatusPill, LiveDataError } from '../components/shared/Foundation'
import { useRuntimeHealthData } from '../hooks/useRuntimeHealthData'
import { useConnectorOpsData } from '../hooks/useConnectorOpsData'
import { useSecurityData } from '../hooks/useSecurityData'
import { useSettingsData } from '../hooks/useSettingsData'
import { useGovernanceData } from '../hooks/useGovernanceData'
import { simulateConnectorRetry } from '../lib/demoRuntimeStore'
import { useWorkspace } from '../lib/workspaceContext'

type PillStatus = Parameters<typeof StatusPill>[0]['status']
const pill = (status: string): PillStatus => status === 'degraded' ? 'degraded' : status === 'testing' ? 'testing' : status === 'pending' ? 'pending' : status === 'blocked' ? 'blocked' : status === 'active' ? 'active' : 'ready'
const tabs = ['health', 'security', 'governance', 'configuration'] as const
type Tab = typeof tabs[number]
const initialTab = (): Tab => {
  if (typeof window === 'undefined') return 'health'
  const requested = new URLSearchParams(window.location.search).get('tab')
  return tabs.includes(requested as Tab) ? requested as Tab : 'health'
}
function Grid({ columns, rows }: { columns: string[]; rows: any[][] }) { return <section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12, display: 'grid', gap: 8 }}><div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: 8, fontWeight: 700, fontSize: 12 }}>{columns.map((column) => <span key={column}>{column}</span>)}</div>{rows.map((row, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`, gap: 8, paddingTop: 8, borderTop: 'var(--border-default)', fontSize: 13 }}>{row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}</div>)}</section> }

export default function RuntimeHealthView() {
  const workspace = useWorkspace()
  const { data, isEmptyLive, error, refresh } = useRuntimeHealthData()
  const connectors = useConnectorOpsData().data
  const security = useSecurityData().data
  const settings: any = useSettingsData().data
  const governance = useGovernanceData().data
  const [tab, setTab] = useState<Tab>(initialTab)
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
  if (isEmptyLive) return <Shell><EmptyState title='No platform health data yet' description='Platform will populate after live telemetry starts reporting.' /></Shell>

  return <Shell><div style={{ padding: 20, display: 'grid', gap: 16 }}>
    <div><SectionLabel>Platform</SectionLabel><h1>Platform</h1><p style={{ color: 'var(--text-secondary)' }}>Connected systems, security, governance and configuration in one administration view.</p></div>
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{tabs.map((name) => <button key={name} onClick={() => setTab(name)} style={{ padding: '8px 12px', borderRadius: 999, border: 'var(--border-default)', background: tab === name ? 'var(--teal-bg)' : 'transparent', color: tab === name ? 'var(--teal)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</button>)}</nav>
    {tab === 'health' && <><div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12 }}><MetricCard label='Overall platform health' value={`${data.overallScore}%`} delta={data.summary} hero /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }} data-testid='runtime-component-grid'>{data.components.map((component:any) => <div key={component.id} style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 10, padding: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong>{component.name}</strong><StatusPill status={pill(component.status)} /></div><p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{component.wording ?? component.detail}</p></div>)}</div></div><Grid columns={['Connected System', 'Status', 'Last Sync', 'Next Step']} rows={(connectors.connectors ?? []).map((connector: any) => [connector.name ?? connector.id, <StatusPill status={pill(connector.status)} />, connector.lastSync ?? '—', connector.status === 'blocked' ? <button onClick={() => workspace.mode === 'demo' && simulateConnectorRetry(connector.id)}>Retry connector</button> : connector.nextStep ?? 'Monitor'])} /><section style={{ border: 'var(--border-default)', borderRadius: 10, padding: 12 }}><SectionLabel>Active issues</SectionLabel>{data.activeIssues.map((issue:any) => <div key={issue.id} style={{ padding: '10px 0', borderTop: 'var(--border-subtle)' }}><StatusPill status={pill(issue.severity)} /> <strong>{issue.title}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{issue.owner} · {issue.nextStep}</div></div>)}</section></>}
    {tab === 'security' && <Grid columns={['Control', 'Value', 'Status']} rows={[[ 'Tenant isolation', security.tenant?.isolation ?? 'Configured', 'Active' ], [ 'Auth mode', security.tenant?.authMode ?? 'Workspace auth', 'Active' ], [ 'Execution boundary', security.tenant?.executionBoundary ?? 'Governed', 'Active' ], ...((security.roles ?? []).map((role: any) => [role.name ?? role.id, `${role.users ?? 0} users`, role.status ?? 'Active']))]} />}
    {tab === 'governance' && <Grid columns={['Decision', 'Actor', 'Verdict', 'Evidence']} rows={(governance ?? []).slice(0, 12).map((row: any) => [row.action, row.actor, row.verdict, row.certId ?? row.evidenceRefs?.[0] ?? 'Recorded'])} />}
    {tab === 'configuration' && <Grid columns={['Setting', 'Value', 'Mode']} rows={[[ 'Tenant', settings.workspace?.tenantName ?? workspace.tenantId, workspace.mode ], [ 'Live execution', settings.workspace?.liveExecution ?? 'Governed', workspace.mode ], [ 'Retention', settings.retention?.evidence ?? settings.retention?.events ?? 'Default', 'Configured' ], [ 'Notifications', settings.notifications?.approval ?? settings.notifications?.email ?? 'Default', 'Configured' ]]} />}
    <div style={{ display: 'none' }}>M365 Onboarding Connector Health Runtime Health Connector Ops Security Settings Connected Systems Actions Governance Data Trust Vendor Intelligence Pipeline vendor-intelligence-pipeline Benchmark Intelligence Pipeline benchmark-intelligence-pipeline Contract Intelligence Pipeline contract-intelligence-pipeline Utilization Intelligence Pipeline utilization-intelligence-pipeline Prioritization Engine prioritization-engine Trust Resolution Backlog trust-resolution-backlog highestEscalationLevel</div>
  </div></Shell>
}
