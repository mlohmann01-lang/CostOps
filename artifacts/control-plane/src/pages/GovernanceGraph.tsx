import { Network } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { WorkspaceModeBanner, ExecutiveBarChart, ExecutiveKpiCard, ExecutivePageShell, ExecutiveSection, RiskBadge, StatusBadge } from '../components/executive'
import { demoStory } from '../lib/demoStory'
import { useGovernanceGraphData } from '../hooks/useGovernanceGraphData'

const money = (value?: number) => typeof value === 'number' ? `$${Math.round(value).toLocaleString()}` : '—'
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
const columns = '1fr 1fr 1fr .8fr .8fr .55fr .6fr 1.1fr .5fr'

export default function GovernanceGraph() {
  const { data } = useGovernanceGraphData()
  const node = (id?: string) => data.nodes.find((item) => item.id === id)
  const apps = data.nodes.filter((item) => item.type === 'APPLICATION')
  const appRows = apps.map((app) => {
    const vendor = node(data.edges.find((edge) => edge.targetId === app.id && edge.type === 'OWNS_APPLICATION')?.sourceId)
    const owner = node(data.edges.find((edge) => edge.sourceId === app.id && edge.type === 'HAS_OWNER')?.targetId)
    const domains = ((app.metadata?.domains ?? []) as string[])
    const relatedFindings = data.nodes.filter((finding) => finding.type === 'FINDING' && domains.includes(String(finding.domain)))
    const evidenceCount = data.insights.filter((insight) => insight.relatedNodeIds.includes(app.id)).flatMap((insight) => insight.evidenceRefs).length
    return { app, vendor, owner, domains, relatedFindings, evidenceCount, renewal: String(app.metadata?.renewalDate ?? '—') }
  })
  const multi = appRows.filter((row) => row.domains.length > 1)
  const ownerless = appRows.filter((row) => !row.owner)
  const evidence = data.nodes.filter((item) => item.type === 'EVIDENCE')

  return <Shell><ExecutivePageShell title='Technology Governance Graph' subtitle='Connect vendors, applications, owners, renewals, findings, risks, opportunities, and evidence across the technology portfolio.' badgeLabel='Read-only relationship intelligence' badgeTone='info' narrative={demoStory.governanceGraphNarrative}>
    <div aria-label='Workspace Mode'><WorkspaceModeBanner dataSourceOverride='Sample governance dataset' executionOverride='Execution disabled' /></div>
    <div data-testid='governance-graph-kpis' style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12 }}>
      <ExecutiveKpiCard label='Vendors' value={data.summary.vendors} tone='info' />
      <ExecutiveKpiCard label='Applications' value={data.summary.applications} tone='info' />
      <ExecutiveKpiCard label='Findings' value={data.summary.findings} tone='warning' />
      <ExecutiveKpiCard label='Ownerless Applications' value={data.summary.ownerlessApplications} tone='danger' />
      <ExecutiveKpiCard label='High-Risk Applications' value={data.summary.highRiskApplications} tone='danger' />
      <ExecutiveKpiCard label='Annual Cost Mapped' value={money(data.summary.annualCostMapped)} tone='warning' />
      <ExecutiveKpiCard label='Potential Savings Mapped' value={money(data.summary.potentialAnnualSavingsMapped)} tone='good' />
      <ExecutiveKpiCard label='Domains Represented' value={data.summary.domainsRepresented.length} tone='neutral' />
    </div>

    <ExecutiveSection testId='relationship-overview' title='Relationship Overview' description='A canonical relationship summary without a complex graph visualisation.' rightSlot={<StatusBadge status={`${data.nodes.length} nodes · ${data.edges.length} edges`} tone='info' />}>
      <p><Network size={14} /> {data.nodes.length} canonical nodes and {data.edges.length} canonical edges connect vendors, applications, owners, renewals, findings, risks, opportunities, evidence, and source domains.</p>
      <ExecutiveBarChart title='Mapped entities' data={[{ label:'Vendors', value:data.summary.vendors }, { label:'Applications', value:data.summary.applications }, { label:'Findings', value:data.summary.findings }, { label:'Evidence', value:data.summary.evidenceItems }]} />
    </ExecutiveSection>

    <ExecutiveSection testId='critical-insights' title='Critical Relationship Insights' description='Relationship insights that show where leadership attention should focus.'>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12 }}>{data.insights.map((insight) => <article key={insight.id} style={{ border:'var(--border-default)', borderRadius:14, padding:14 }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><strong>{insight.title}</strong><RiskBadge level={insight.severity} /></div><p style={{ color:'var(--text-secondary)', lineHeight:1.5 }}>{insight.rationale}</p><p style={{ margin:0 }}>Recommended action: <strong>{insight.recommendedAction}</strong></p><p style={{ color:'var(--text-tertiary)' }}>Evidence: {insight.evidenceRefs.join(', ') || 'Needs linkage'}</p></article>)}</div>
    </ExecutiveSection>

    <ExecutiveSection testId='application-relationship-table' title='Application Relationship Table' description='Applications connected to vendors, owners, findings, risk, domains and evidence.'>
      <div style={{ overflowX:'auto' }}><div style={{ minWidth:980 }}><div style={{ display:'grid', gridTemplateColumns:columns, gap:8, fontWeight:700, color:'var(--text-tertiary)', borderBottom:'var(--border-default)', paddingBottom:8 }}><span>Application</span><span>Vendor</span><span>Owner</span><span>Annual Cost</span><span>Renewal</span><span>Findings</span><span>Risk</span><span>Domains</span><span>Evidence</span></div>{appRows.map((row) => <div key={row.app.id} style={{ display:'grid', gridTemplateColumns:columns, gap:8, borderBottom:'var(--border-default)', padding:'10px 0', alignItems:'center' }}><strong>{row.app.label}</strong><span>{row.vendor?.label ?? '—'}</span><span>{row.owner?.label ?? 'Ownerless'}</span><span>{money(row.app.annualCost)}</span><span>{row.renewal}</span><span>{row.relatedFindings.length}</span><RiskBadge level={row.app.riskLevel ?? 'LOW'} /><span>{row.domains.map(label).join(', ')}</span><span>{row.evidenceCount}</span></div>)}</div></div>
    </ExecutiveSection>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
      <ExecutiveSection testId='multi-domain-clusters' title='Multi-Domain Risk Clusters' description='Apps appearing across several governance domains.'>{multi.filter((row) => ['ChatGPT','Dropbox','Slack','Tableau','Claude'].includes(row.app.label)).map((row) => <p key={row.app.id}><strong>{row.app.label}</strong> · {row.domains.map(label).join(', ')}</p>)}</ExecutiveSection>
      <ExecutiveSection testId='ownerless-governance' title='Ownerless / Blocked Governance' description='Applications missing owner relationships.'>{ownerless.map((row) => <p key={row.app.id}><strong>{row.app.label}</strong> · {money(row.app.annualCost)} mapped cost · owner relationship missing</p>)}</ExecutiveSection>
      <ExecutiveSection testId='evidence-linkage' title='Evidence Linkage' description='Evidence refs and which relationships they support.'>{evidence.map((item) => <p key={item.id}><strong>{item.label}</strong> · supports findings and executive proof</p>)}</ExecutiveSection>
    </div>
  </ExecutivePageShell></Shell>
}
