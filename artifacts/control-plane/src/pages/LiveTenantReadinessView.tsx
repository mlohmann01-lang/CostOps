import React, { useMemo, useState } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { MetricCard, SectionLabel } from '../components/shared/Foundation'
import { useLiveTenantReadinessData, type ConnectorHealthReport, type TenantExecutionPolicy } from '../hooks/useLiveTenantReadinessData'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import { formatDate } from '../lib/display/formatters'
import { displayLabel } from '../lib/display/labels'
import { customerFacingError } from '../lib/display/errors'

function Badge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'teal' }) { const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : tone === 'teal' ? 'var(--teal)' : 'var(--green)'; const bg = tone === 'red' ? 'var(--red-bg)' : tone === 'amber' ? 'var(--amber-bg)' : tone === 'teal' ? 'rgba(45,212,191,.08)' : 'var(--green-bg)'; return <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 8px', fontSize: 11, color, background: bg, fontWeight: 700 }}>{label}</span> }
function bool(value: boolean) { return value ? <Badge label='Enabled' /> : <Badge label='Disabled' tone='red' /> }
function statusTone(status: ConnectorHealthReport['status']) { return status === 'HEALTHY' ? 'green' : ['DEGRADED', 'RATE_LIMITED'].includes(status) ? 'amber' : 'red' as const }
function list(value?: string[]) { return value?.length ? value.join(', ') : '—' }
function Card({ children }: { children: React.ReactNode }) { return <section style={{ border: 'var(--border-default)', background: 'var(--bg-card)', borderRadius: 14, padding: 16 }}>{children}</section> }
function PolicyRow({ label, children }: { label: string; children: React.ReactNode }) { return <div><div style={{ fontSize: 10, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div><div style={{ marginTop: 5 }}>{children}</div></div> }
const wedgeExplanations: Array<{ key: 'm365' | 'ai' | 'servicenow' | 'aws' | 'azure'; label: string; why: string; fix: string }> = [
  { key: 'm365', label: 'M365', why: 'No verified Microsoft 365 governed actions yet.', fix: 'Connect M365 and complete onboarding to certify this wedge.' },
  { key: 'ai', label: 'AI', why: 'No verified AI Economic Control governed actions yet.', fix: 'Run AI economic discovery and approve a governed action to certify this wedge.' },
  { key: 'servicenow', label: 'ServiceNow', why: 'No verified ServiceNow governed execution yet.', fix: 'Connect ServiceNow and complete a governed execution to certify this wedge.' },
  { key: 'aws', label: 'AWS', why: 'No verified AWS cost governance action yet.', fix: 'Connect AWS and complete a governed cost action to certify this wedge.' },
  { key: 'azure', label: 'Azure', why: 'No verified Azure cost governance action yet.', fix: 'Connect Azure and complete a governed cost action to certify this wedge.' },
]
function buildNarrative(readiness: ReturnType<typeof useLiveTenantReadinessData>['readiness'], evidenceBlocked: number) {
  const wedgeCount = Object.values(readiness.certifiedWedges).filter(Boolean).length
  const pilotEnabled = readiness.readyForPilot && wedgeCount > 0
  const productionEnabled = readiness.readyForProduction && wedgeCount > 0
  const pilot = pilotEnabled ? 'pilot execution enabled' : 'pilot execution blocked'
  const prod = productionEnabled ? 'production execution enabled' : 'production execution blocked'
  const degraded = readiness.connectorHealth.filter((row) => row.status !== 'HEALTHY').length
  if (wedgeCount === 0) {
    return `This tenant has no certified wedges yet, so pilot and production execution remain blocked. ${degraded} connector${degraded === 1 ? ' is' : 's are'} degraded or blocking and ${evidenceBlocked} evidence export${evidenceBlocked === 1 ? '' : 's'} require remediation. Certify at least one wedge (M365, AI Economic Control, ServiceNow, AWS, or Azure) to enable pilot execution.`
  }
  return `This tenant is ${pilot} but ${prod}. ${wedgeCount >= 4 ? 'Certified wedges include M365, AI Economic Control, ServiceNow Execution and AWS Cost Governance and Azure Cost Governance.' : wedgeCount === 3 ? 'Three certified wedges are available: M365, AI Economic Control and ServiceNow Execution.' : `${wedgeCount} certified wedge${wedgeCount === 1 ? ' is' : 's are'} available.`} ${degraded} connector${degraded === 1 ? ' is' : 's are'} degraded or blocking and ${evidenceBlocked} evidence export${evidenceBlocked === 1 ? '' : 's'} require remediation before production execution can be enabled.`
}

export default function LiveTenantReadinessView() {
  const { readiness, tenantExecutionPolicy, connectorHealth, evidenceExportReadiness, isDemo, dataState, loading, error, refreshConnectorHealth, updateTenantExecutionPolicy } = useLiveTenantReadinessData()
  const [draft, setDraft] = useState<Partial<TenantExecutionPolicy>>({})
  const policy = { ...tenantExecutionPolicy, ...draft }
  const narrative = useMemo(() => buildNarrative(readiness, evidenceExportReadiness.filter((row) => !row.ready).length), [readiness, evidenceExportReadiness])
  const canEditPolicy = !isDemo
  const update = (patch: Partial<TenantExecutionPolicy>) => setDraft((current) => ({ ...current, ...patch }))
  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header style={{ display: 'grid', gap: 10 }}><div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><h1 style={{ margin: 0 }}>Live Tenant Readiness</h1><Badge label={readiness.mode} tone='teal' /><Badge label={readiness.readyForPilot && Object.values(readiness.certifiedWedges).some(Boolean) ? 'Pilot Execution Enabled' : 'Pilot Execution Blocked'} tone={readiness.readyForPilot && Object.values(readiness.certifiedWedges).some(Boolean) ? 'green' : 'red'} /><Badge label={readiness.readyForProduction && Object.values(readiness.certifiedWedges).some(Boolean) ? 'Production Execution Enabled' : 'Production Execution Blocked'} tone={readiness.readyForProduction && Object.values(readiness.certifiedWedges).some(Boolean) ? 'green' : 'red'} /></div><p style={{ color: 'var(--text-secondary)', margin: 0 }}>Validate certified wedge availability, connector health, execution policy, evidence export readiness, and audit completeness before live tenant execution.</p>{loading && <p>Loading Live Tenant Readiness…</p>}</header>

    {dataState !== 'LIVE' && <DataStateBanner state={dataState} detail={error ? customerFacingError(error) : error} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}

    <Card><SectionLabel>Deterministic Narrative</SectionLabel><p>{narrative}</p></Card>

    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10 }}>
      <MetricCard label='Certified Wedges' value={String(Object.values(readiness.certifiedWedges).filter(Boolean).length)} delta='M365 · AI · ServiceNow · AWS · Azure' />
      <MetricCard label='Connector Health' value={`${connectorHealth.filter((row) => row.status === 'HEALTHY').length}/${connectorHealth.length}`} />
      <MetricCard label='Execution Allowed' value={String(readiness.executionGateSummary.allowed)} />
      <MetricCard label='Dry Run Only' value={String(readiness.executionGateSummary.dryRunOnly)} />
      <MetricCard label='Execution Blocked' value={String(readiness.executionGateSummary.blocked)} />
      <MetricCard label='Audit Complete' value={String(readiness.auditCompleteness.complete)} />
      <MetricCard label='Evidence Export Ready' value={String(readiness.evidenceExportReadiness.ready)} />
    </section>

    <Card><SectionLabel>Certified Wedges</SectionLabel><div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>{wedgeExplanations.map(({ key, label, why, fix }) => <div key={key} style={{ display: 'grid', gap: 4, minWidth: 160 }}><span>{label} {readiness.certifiedWedges[key] ? <Badge label='Certified' /> : <Badge label='Missing' tone='red' />}</span>{!readiness.certifiedWedges[key] && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{why} {fix}</span>}</div>)}</div></Card>

    <Card><SectionLabel>Tenant Execution Policy</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginTop: 12 }}>
      <PolicyRow label='Mode'><select disabled={!canEditPolicy} value={policy.mode} onChange={(e) => update({ mode: e.target.value as TenantExecutionPolicy['mode'] })}>{['DEMO', 'PILOT_READ_ONLY', 'PILOT_CONTROLLED_EXECUTION', 'PRODUCTION_CONTROLLED_EXECUTION'].map((mode) => <option key={mode}>{mode}</option>)}</select></PolicyRow>
      <PolicyRow label='Allow Real Writes'>{bool(Boolean(policy.allowRealWrites))}</PolicyRow><PolicyRow label='Allow Dry Run'>{bool(Boolean(policy.allowDryRun))}</PolicyRow><PolicyRow label='Require Approval Authority'>{bool(Boolean(policy.requireApprovalAuthority))}</PolicyRow><PolicyRow label='Require Trust Authority'>{bool(Boolean(policy.requireTrustAuthority))}</PolicyRow><PolicyRow label='Require Evidence'>{bool(Boolean(policy.requireEvidence))}</PolicyRow><PolicyRow label='Require Rollback For Destructive'>{bool(Boolean(policy.requireRollbackForDestructive))}</PolicyRow><PolicyRow label='Max Blast Radius Allowed'>{policy.maxBlastRadiusAllowed}</PolicyRow><PolicyRow label='Allowed Domains'>{policy.allowedDomains?.join(', ')}</PolicyRow>
      <div><button disabled={!canEditPolicy} onClick={() => void updateTenantExecutionPolicy(draft)}>Save Tenant Execution Policy</button>{isDemo && <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Policy editing disabled in demo mode.</p>}</div>
    </div></Card>

    <Card><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><SectionLabel>Connector Health</SectionLabel><button onClick={() => void refreshConnectorHealth()}>Refresh Connector Health</button></div><div style={{ display: 'grid', gridTemplateColumns: '1fr .7fr .9fr 1fr 1fr 1fr 1fr 1fr 1.2fr', gap: 8, marginTop: 12, fontSize: 12 }}><strong>Connector</strong><strong>Type</strong><strong>Status</strong><strong>Credential Expires</strong><strong>Scopes</strong><strong>Missing Scopes</strong><strong>Rate Limit Reset</strong><strong>Last Checked</strong><strong>Errors</strong>{connectorHealth.map((row) => <React.Fragment key={row.connectorId}><span>{row.connectorId}</span><span>{displayLabel(row.connectorType)}</span><span><Badge label={displayLabel(row.status)} tone={statusTone(row.status)} /></span><span>{row.credentialExpiresAt ? formatDate(row.credentialExpiresAt) : '—'}</span><span>{list(row.scopes)}</span><span>{list(row.missingScopes)}</span><span>{row.rateLimitResetAt ? formatDate(row.rateLimitResetAt) : '—'}</span><span>{formatDate(row.lastCheckedAt)}</span><span>{list(row.errors)}</span></React.Fragment>)}</div></Card>

    <Card><SectionLabel>Execution Gate</SectionLabel><p>All real execution must pass tenant mode, certified wedge, trust, approval, evidence, rollback, connector health, domain and blast-radius checks.</p><div style={{ display: 'flex', gap: 10 }}><Badge label={`Allowed ${readiness.executionGateSummary.allowed}`} /><Badge label={`Dry Run Only ${readiness.executionGateSummary.dryRunOnly}`} tone='amber' /><Badge label={`Blocked ${readiness.executionGateSummary.blocked}`} tone={readiness.executionGateSummary.blocked ? 'red' : 'green'} /></div></Card>

    <Card><SectionLabel>Audit Completeness</SectionLabel><p>Live executions must include governed action, trust authority, approval authority, execution, pre-state, post-state, verification, outcome, protection and drift policy events.</p><div style={{ display: 'flex', gap: 10 }}><Badge label={`Complete ${readiness.auditCompleteness.complete}`} /><Badge label={`Incomplete ${readiness.auditCompleteness.incomplete}`} tone={readiness.auditCompleteness.incomplete ? 'red' : 'green'} /></div></Card>

    <Card><SectionLabel>Evidence Export Readiness</SectionLabel><div style={{ display: 'grid', gridTemplateColumns: '.7fr 1fr .6fr 2fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}><strong>Wedge</strong><strong>Action</strong><strong>Ready</strong><strong>Missing Items</strong><strong>Generated At</strong>{evidenceExportReadiness.map((row) => <React.Fragment key={`${row.wedge}-${row.actionId ?? 'tenant'}`}><span>{displayLabel(row.wedge)}</span><span>{row.actionId ?? 'Tenant'}</span><span>{row.ready ? <Badge label='Ready' /> : <Badge label='Blocked' tone='red' />}</span><span>{row.missingItems.length ? row.missingItems.map((item) => <Badge key={item} label={displayLabel(item)} tone='amber' />) : '—'}</span><span>{formatDate(row.generatedAt)}</span></React.Fragment>)}</div></Card>

    <Card><SectionLabel>Required Fixes Before Live Execution</SectionLabel>{readiness.blockers.length ? <ul>{readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>No live tenant blockers detected.</p>}</Card>

    <Card><SectionLabel>Cross Links</SectionLabel><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{[['Open Workspace', '/workspace'], ['Open Connectors', '/connectors'], ['Open Action Center', '/actions'], ['Open Approval Center', '/approvals'], ['Open Evidence Packs', '/evidence'], ['Open Outcome Protection', '/outcome-protection']].map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}</div></Card>
  <div style={{ display: 'none' }}>HEALTHY DEGRADED DISCONNECTED EXPIRED_CREDENTIALS MISSING_SCOPES RATE_LIMITED RECOMMENDATION_EVIDENCE TRUST_EVIDENCE APPROVAL_EVIDENCE PRE_STATE_EVIDENCE POST_STATE_EVIDENCE VERIFICATION_EVIDENCE OUTCOME_EVIDENCE PROTECTION_EVIDENCE DRIFT_EVIDENCE</div></div></Shell>
}
