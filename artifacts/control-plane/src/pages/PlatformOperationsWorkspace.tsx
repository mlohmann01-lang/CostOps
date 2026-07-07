import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip } from '../components/executive'
import { demoPlatformEvidence, emptyPlatformEvidence, getPlatformEvidencePackCompleteness, inferPlatformDecision, platformCapabilities, program5LiveUnconnectedCopy, program5PlatformQuestion, summarizePlatformKpis } from '../lib/program5Platform'
import { useWorkspace } from '../lib/workspaceContext'
import type { PlatformEvidence } from '../lib/program5Platform'

const tone = (value: string) => /BLOCK|FAIL|MISSING|NOT_READY|UNKNOWN/i.test(value) ? 'danger' : /CONFIGURE|CONNECT|VERIFY|DEGRADED|WARN|PARTIAL|UNVERIFIED/i.test(value) ? 'warning' : /READY|HEALTHY|COMPLETE|PASS|AVAILABLE/i.test(value) ? 'success' : 'info' as any

export function renderPlatformWorkspaceState(evidence: PlatformEvidence, isDemo = false) {
  const kpis = summarizePlatformKpis(evidence)
  return {
    title: 'Platform Operations',
    question: program5PlatformQuestion,
    emptyLive: !isDemo && !evidence.tenantIdentifier,
    hasDemoStory: isDemo && Boolean(evidence.tenantIdentifier && evidence.runtimeMode && evidence.connectorInventory?.length && evidence.adminSettingsState),
    kpis,
    decision: inferPlatformDecision(evidence).decision,
    evidenceStatus: getPlatformEvidencePackCompleteness(evidence).status,
  }
}

function EvidencePack({ evidence }: { evidence: PlatformEvidence }) {
  const completeness = getPlatformEvidencePackCompleteness(evidence)
  const decision = inferPlatformDecision(evidence)
  return <div style={{ border: 'var(--border-default)', borderRadius: 12, padding: 12, display: 'grid', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>Platform Evidence Pack / Proof Pack</strong><StatusChip label={completeness.status} tone={tone(completeness.status) as any} /></div>
    <p style={{ margin: 0 }}>Operational decision: <StatusChip label={decision.decision} tone={tone(decision.decision) as any} /> {decision.reason}</p>
    <p style={{ margin: 0 }}>Tenant: {evidence.tenantIdentifier ?? 'Missing'} · Runtime mode: {evidence.runtimeMode ?? 'Missing'} · Readiness: {evidence.readinessStatus ?? 'Missing'}</p>
    <p style={{ margin: 0 }}>Connectors: {(evidence.connectorInventory ?? []).join(', ') || 'Missing'} · Health: {Object.entries(evidence.connectorHealth ?? {}).map(([name, status]) => `${name}:${status}`).join(', ') || 'Missing'}</p>
    <p style={{ margin: 0 }}>Evidence sources: {evidence.evidenceSourceStatus ?? 'Missing'} · Admin/settings: {evidence.adminSettingsState ?? 'Missing'} · Roles: {evidence.userRolePermissionState ?? 'Missing'}</p>
    <p style={{ margin: 0 }}>Health check: {evidence.healthCheckResult ?? 'Missing'} · Timestamp: {evidence.timestamp ?? 'Missing'} · Lineage: {evidence.lineage ?? 'Missing'} · Confidence: {evidence.confidence ?? 'Unknown'}% · Trust/proof reference: {evidence.trustProofReference ?? 'Missing'}</p>
    {completeness.missing.length > 0 && <p style={{ margin: 0 }}>Missing evidence: {completeness.missing.join(', ')}</p>}
  </div>
}

export default function PlatformOperationsWorkspace({ section }: { section?: string }) {
  const workspace = useWorkspace()
  const isDemo = workspace.mode === 'demo'
  const evidence = isDemo ? demoPlatformEvidence : emptyPlatformEvidence
  const kpis = summarizePlatformKpis(evidence)
  const decision = inferPlatformDecision(evidence)
  const selected = section?.toLowerCase()
  return <Shell><main style={{ padding: '24px clamp(18px,3vw,34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto' }}>
    <ExecutivePageHeader title={selected ? `Platform Operations — ${selected.toUpperCase()}` : 'Platform Operations'} subtitle={`${program5PlatformQuestion} One operational trust layer for Admin, Runtime, Connectors, Health, Tenants and Settings — not a generic admin panel.`} chips={[{ label: `Tenant: ${evidence.tenantIdentifier ?? workspace.tenantId}`, tone: isDemo ? 'info' : 'warning' }, { label: `Runtime mode: ${evidence.runtimeMode ?? (workspace.mode === 'live' ? 'LIVE_UNCONNECTED' : 'DEMO')}`, tone: isDemo ? 'info' : 'warning' }, { label: `Decision: ${decision.decision}`, tone: tone(decision.decision) as any }]} />
    {!isDemo && <EmptyState title='Platform Operations unavailable.' description={program5LiveUnconnectedCopy('Platform Operations')} />}

    <ExecutiveSection title='Unified Platform Operations Workspace' description='One product surface across Admin, Runtime, Connectors, Health, Tenants, Settings, Readiness, Platform Evidence Pack and Platform Proof Pack. No demo live connector health, tenant readiness, live settings, live users, live roles, evidence sources, health status, live readiness or operational confidence are shown in LIVE_UNCONNECTED.'>{platformCapabilities.map((capability) => <a key={capability.key} href={capability.route} style={{ display: 'inline-flex', margin: '0 8px 8px 0', border: 'var(--border-default)', borderRadius: 999, padding: '8px 12px', color: 'var(--teal)', fontWeight: 800 }}>{capability.label}</a>)}</ExecutiveSection>

    <section data-testid='platform-kpis' style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(160px,1fr))', gap: 12 }}>
      <MetricCard label='Tenant Readiness' value={kpis.tenantReadiness} description='Readiness for trusted governance workflows.' />
      <MetricCard label='Runtime Mode' value={kpis.runtimeMode} description='Visible active operating mode.' />
      <MetricCard label='Connected Sources' value={kpis.connectedSources} description='Configured connector/evidence sources.' />
      <MetricCard label='Healthy Connectors' value={kpis.healthyConnectors} description='Connectors reporting healthy state.' />
      <MetricCard label='Degraded Connectors' value={kpis.degradedConnectors} description='Connectors needing attention.' />
      <MetricCard label='Blocked Capabilities' value={kpis.blockedCapabilities} description='Capabilities blocked by missing platform evidence.' />
      <MetricCard label='Live-Ready Capabilities' value={kpis.liveReadyCapabilities} description='Capabilities ready for live workflows.' />
      <MetricCard label='Evidence Source Coverage' value={kpis.evidenceSourceCoverage} description='Source evidence availability.' />
      <MetricCard label='Health Check Status' value={kpis.healthCheckStatus} description='Latest operational health check.' />
      <MetricCard label='Platform Evidence Completeness' value={kpis.platformEvidenceCompleteness === undefined ? 'Unknown' : `${kpis.platformEvidenceCompleteness}%`} description='Complete Platform Evidence Pack rate.' />
    </section>

    <ExecutiveSection title='Admin, Runtime, Tenants and Settings' description='Operator context and controls that determine whether governance workflows can be trusted.'>{evidence.tenantIdentifier ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(180px,1fr))', gap: 12 }}><p>Tenant identifier: {evidence.tenantIdentifier}</p><p>Runtime mode: {evidence.runtimeMode}</p><p>Admin/settings state: {evidence.adminSettingsState}</p><p>User/role/permission state: {evidence.userRolePermissionState}</p></div> : <EmptyState title='No tenant or runtime evidence yet.' description='Connected tenant, runtime, admin and settings evidence is required before platform readiness can be assessed.' />}</ExecutiveSection>

    <ExecutiveSection title='Connector and Health Status' description='Connector inventory, readiness, health and operational risks.'>{evidence.connectorInventory?.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Connector', 'Health', 'Evidence source status', 'Decision'].map((header) => <th key={header} style={{ textAlign: 'left', padding: 8 }}>{header}</th>)}</tr></thead><tbody>{evidence.connectorInventory.map((name) => <tr key={name}><td>{name}</td><td><StatusChip label={evidence.connectorHealth?.[name] ?? 'UNKNOWN'} tone={tone(evidence.connectorHealth?.[name] ?? 'UNKNOWN') as any} /></td><td>{evidence.evidenceSourceStatus}</td><td><StatusChip label={decision.decision} tone={tone(decision.decision) as any} /></td></tr>)}</tbody></table></div> : <EmptyState title='No connector health evidence yet.' description={program5LiveUnconnectedCopy('Connectors')} />}</ExecutiveSection>

    <ExecutiveSection title='Platform Evidence Pack and Proof Pack' description='Evidence packs expose tenant identifier, runtime mode, connector inventory, connector health, evidence status, readiness, settings, roles, health check, timestamp, lineage, confidence and trust proof.'><EvidencePack evidence={evidence} /></ExecutiveSection>

    <ExecutiveSection title='Platform Decision Model' description='READY · CONFIGURE · CONNECT · VERIFY · DEGRADED · BLOCKED'><p>All required platform evidence present → READY. Missing required settings → CONFIGURE. Missing connectors → CONNECT. Connector exists but not verified → VERIFY. Health issue detected → DEGRADED. Critical missing operational evidence → BLOCKED.</p></ExecutiveSection>
  </main></Shell>
}
