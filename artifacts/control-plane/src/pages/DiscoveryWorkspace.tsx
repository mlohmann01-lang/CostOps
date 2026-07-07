import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip } from '../components/executive'
import { demoDiscoveryOpportunities, discoveryDomains, getDiscoveryEvidencePackCompleteness, inferDiscoveryDecision, program3DiscoveryQuestion, program3LiveUnconnectedCopy, summarizeDiscoveryKpis } from '../lib/program3Discovery'
import { useWorkspace } from '../lib/workspaceContext'
import type { DiscoveryOpportunity } from '../lib/program3Discovery'

const money = (value?: number) => value === undefined ? 'Unknown' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const tone = (value: string) => /BLOCK|MISSING|HIGH|ASSIGN_OWNER/i.test(value) ? 'danger' : /REVIEW|APPROVE|ESTIMATED|PARTIAL/i.test(value) ? 'warning' : /EXECUTE|OPTIMISE|CONSOLIDATE|RETIRE|PROTECT|COMPLETE|VERIFIED/i.test(value) ? 'success' : 'info' as any

export function renderDiscoveryWorkspaceState(opportunities: DiscoveryOpportunity[], isDemo = false) {
  const kpis = summarizeDiscoveryKpis(opportunities)
  return {
    title: 'Discovery',
    question: program3DiscoveryQuestion,
    hasDemoStory: isDemo && discoveryDomains.every((domain) => opportunities.some((item) => domain.label.includes(item.domain.split(' ')[0]) || item.domain.includes(domain.label.split(' ')[0]))),
    emptyLive: !isDemo && opportunities.length === 0,
    kpis,
    decisions: opportunities.map((item) => inferDiscoveryDecision(item).decision),
    evidenceStatuses: opportunities.map((item) => getDiscoveryEvidencePackCompleteness(item).status),
  }
}

function EvidencePack({ item }: { item: DiscoveryOpportunity }) {
  const completeness = getDiscoveryEvidencePackCompleteness(item)
  const decision = inferDiscoveryDecision(item)
  return <div style={{ border: 'var(--border-default)', borderRadius: 12, padding: 12, display: 'grid', gap: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{item.assetName}</strong><StatusChip label={completeness.status} tone={tone(completeness.status) as any} /></div>
    <p style={{ margin: 0 }}>Discovery Evidence Pack / Proof Pack · {item.sourceSystem} · {item.opportunityType} · {item.assetIdentifier}</p>
    <p style={{ margin: 0 }}>Owner: {item.owner ?? item.ownerStatus} · Business unit/cost centre: {item.businessUnit ?? item.costCentre ?? 'Unknown'} · Usage: {item.usageEvidence ?? 'Missing usage evidence'}</p>
    <p style={{ margin: 0 }}>Value/risk basis: {money(item.spendOrValueBasis)} · {item.riskBasis ?? 'No risk basis provided'} · Outcome/protection linkage: {item.outcomeProtectionLinkage ?? 'Not applicable'}</p>
    <p style={{ margin: 0 }}>Decision: <StatusChip label={decision.decision} tone={tone(decision.decision) as any} /> {decision.reason}</p>
    <p style={{ margin: 0 }}>Readiness: {item.executionReadiness} · Verification: {item.verificationStatus} · Confidence: {item.confidence}% · Timestamp: {item.timestamp ?? 'Missing'} · Lineage: {item.lineage ?? 'Missing'}</p>
    {completeness.missing.length > 0 && <p style={{ margin: 0 }}>Missing evidence: {completeness.missing.join(', ')}</p>}
  </div>
}

export default function DiscoveryWorkspace({ domain }: { domain?: string }) {
  const workspace = useWorkspace()
  const isDemo = workspace.mode === 'demo'
  const selected = domain?.toLowerCase()
  const allOpportunities = isDemo ? demoDiscoveryOpportunities : []
  const opportunities = selected && selected !== 'cloud'
    ? allOpportunities.filter((item) => item.domain.toLowerCase().includes(selected) || (selected === 'flexera' && item.domain.includes('ITAM')))
    : selected === 'cloud'
      ? allOpportunities.filter((item) => item.domain.includes('AWS') || item.domain.includes('Azure'))
      : allOpportunities
  const kpis = summarizeDiscoveryKpis(opportunities)
  return <Shell><main style={{ padding: '24px clamp(18px,3vw,34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto' }}>
    <ExecutivePageHeader title={selected ? `Discovery — ${selected.toUpperCase()}` : 'Discovery'} subtitle={`${program3DiscoveryQuestion} This is the executive discovery authority for governed optimisation, risk, ownership, utilisation, renewal, duplication and value opportunities — not a connector catalogue or technical scanner.`} chips={[{ label: `Tenant mode: ${isDemo ? 'Demo' : 'Live'}`, tone: isDemo ? 'info' : 'warning' }, { label: 'Discovery Evidence Pack / Proof Pack', tone: 'info' }, { label: isDemo ? 'Connected multi-domain demo story' : 'LIVE_UNCONNECTED', tone: isDemo ? 'success' : 'warning' }]} />
    {!isDemo && <EmptyState title='Discovery unavailable.' description={program3LiveUnconnectedCopy('Discovery')} />}

    <ExecutiveSection title='Unified Discovery Workspace' description='One product surface across M365, SaaS, AI, Cloud, AWS, Azure, Snowflake, Databricks, ServiceNow and Flexera / ITAM Discovery. Opportunities show source, evidence, value/risk, owner status, recommended decision and execution readiness. No demo opportunities, applications, resources, AI tools, owners, spend, savings, risk values, decisions or execution readiness are shown in LIVE_UNCONNECTED.'>{discoveryDomains.map((domainItem) => <a key={domainItem.key} href={domainItem.route} style={{ display: 'inline-flex', margin: '0 8px 8px 0', border: 'var(--border-default)', borderRadius: 999, padding: '8px 12px', color: 'var(--teal)', fontWeight: 800 }}>{domainItem.label}</a>)}</ExecutiveSection>

    <section data-testid='discovery-kpis' style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(180px,1fr))', gap: 12 }}>
      <MetricCard label='Opportunities Discovered' value={kpis.opportunitiesDiscovered} description='Verified opportunities discovered across source systems.' />
      <MetricCard label='Execution Ready' value={kpis.executionReady} description='Complete evidence + executable action.' />
      <MetricCard label='Approval Required' value={kpis.approvalRequired} description='Governance approval required before action.' />
      <MetricCard label='Missing Owner' value={kpis.missingOwner} description='ASSIGN_OWNER decisions.' />
      <MetricCard label='Value Under Review' value={money(kpis.valueUnderReview)} description='Estimated value requiring review.' />
      <MetricCard label='Estimated Opportunity' value={money(kpis.estimatedOpportunity)} description='Value/risk opportunity basis.' />
      <MetricCard label='Duplicate Capability' value={kpis.duplicateCapability} description='CONSOLIDATE decisions.' />
      <MetricCard label='Evidence Completeness' value={kpis.evidenceCompleteness === undefined ? 'Unknown' : `${kpis.evidenceCompleteness}%`} description='Complete Discovery Evidence Pack rate.' />
    </section>

    <ExecutiveSection title='Opportunity List' description='Actionable opportunities discovered across connected enterprise systems.'>{opportunities.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Domain', 'Opportunity', 'Source', 'Owner', 'Value/Risk', 'Readiness', 'Decision', 'Evidence'].map((header) => <th key={header} style={{ textAlign: 'left', padding: 8 }}>{header}</th>)}</tr></thead><tbody>{opportunities.map((item) => { const decision = inferDiscoveryDecision(item); const evidence = getDiscoveryEvidencePackCompleteness(item); return <tr key={item.id}><td>{item.domain}</td><td>{item.assetName}</td><td>{item.sourceSystem}</td><td>{item.owner ?? item.ownerStatus}</td><td>{money(item.spendOrValueBasis)} · {item.riskBasis ?? 'No risk basis'}</td><td>{item.executionReadiness}</td><td><StatusChip label={decision.decision} tone={tone(decision.decision) as any} /></td><td><StatusChip label={evidence.status} tone={tone(evidence.status) as any} /></td></tr> })}</tbody></table></div> : <EmptyState title='No discovery opportunities yet.' description={program3LiveUnconnectedCopy(selected ? `Discovery — ${selected.toUpperCase()}` : 'Discovery')} />}</ExecutiveSection>

    <ExecutiveSection title='Opportunity Detail, Evidence Pack and Proof Pack' description='Reachable detail panels expose source, evidence, value/risk, readiness, decision, confidence, timestamp and lineage.'>{opportunities.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>{opportunities.map((item) => <EvidencePack key={item.id} item={item} />)}</div> : <EmptyState title='No Discovery Evidence Packs yet.' description='Evidence packs remain empty until connected source systems provide real discovery evidence.' />}</ExecutiveSection>

    <ExecutiveSection title='Discovery Decision Model' description='EXECUTE · APPROVE · REVIEW · ASSIGN_OWNER · OPTIMISE · CONSOLIDATE · RETIRE · PROTECT · BLOCKED'><p>Complete evidence + executable action → EXECUTE. Requires approval → APPROVE. Missing owner → ASSIGN_OWNER. Estimated value only → REVIEW. Duplicate capability → CONSOLIDATE. Dormant/unused asset → RETIRE. Protected outcome required → PROTECT. Missing critical evidence → BLOCKED.</p></ExecutiveSection>
  </main></Shell>
}
