import { FileText } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { WorkspaceModeBanner, EvidenceBadge, ExecutiveBarChart, ExecutiveKpiCard, ExecutivePageShell, ExecutiveSection, RiskBadge, StatusBadge } from '../components/executive'
import { demoStory } from '../lib/demoStory'
import { useExecutiveRiskData } from '../hooks/useExecutiveRiskData'

const money = (value?: number) => typeof value === 'number' ? `$${Math.round(value).toLocaleString()}` : '—'
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
const grid = (columns: string) => ({ display:'grid', gridTemplateColumns: columns, gap: 10, alignItems:'center' })

export default function ExecutiveRiskCommandCenter() {
  const { data } = useExecutiveRiskData()
  const backed = data.topRisks.filter((risk) => risk.evidenceRefs.length > 0).length
  const missing = data.topRisks.length - backed
  const actionLabels = data.leadershipActions.length ? data.leadershipActions : [
    { label:'Assign Owners', count:0, priority:'HIGH', actionType:'ASSIGN_OWNER', rationale:'' },
    { label:'Review AI Policy', count:0, priority:'HIGH', actionType:'REVIEW_AI_POLICY', rationale:'' },
    { label:'Renegotiate Renewals', count:0, priority:'HIGH', actionType:'RENEGOTIATE_RENEWAL', rationale:'' },
    { label:'Consolidate Vendors', count:0, priority:'MEDIUM', actionType:'CONSOLIDATE_VENDOR', rationale:'' },
    { label:'Retire Unused Tools', count:0, priority:'MEDIUM', actionType:'RETIRE_UNUSED_TOOL', rationale:'' },
    { label:'Validate Data', count:0, priority:'MEDIUM', actionType:'VALIDATE_DATA', rationale:'' },
    { label:'Generate Evidence', count:0, priority:'MEDIUM', actionType:'GENERATE_EVIDENCE', rationale:'' },
    { label:'Executive Review', count:0, priority:'HIGH', actionType:'EXECUTIVE_REVIEW', rationale:'' },
  ]

  return <Shell><ExecutivePageShell title='Executive Portfolio Risk & Governance Command Center' subtitle='Prioritise ownership gaps, risky renewals, AI governance exposure, SaaS sprawl, and value opportunities across the technology portfolio.' badgeLabel='Read-only executive intelligence' badgeTone='info' narrative={demoStory.executiveRiskNarrative}>
    <div aria-label='Workspace Mode'><WorkspaceModeBanner dataSourceOverride='Sample governance dataset' executionOverride='Execution disabled' /></div>
    <div data-testid='executive-risk-kpis' style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:12 }}>
      <ExecutiveKpiCard label='Portfolio Risk Score' value={data.summary.portfolioRiskScore} tone='danger' sublabel='Portfolio-level governance risk exposure' />
      <ExecutiveKpiCard label='Critical Issues' value={data.summary.criticalIssues} tone={data.summary.criticalIssues ? 'danger' : 'good'} sublabel='Requires executive attention' />
      <ExecutiveKpiCard label='Ownerless Spend' value={money(data.summary.ownerlessSpend)} tone='warning' sublabel='Spend without clear accountability' />
      <ExecutiveKpiCard label='Renewals At Risk' value={data.summary.renewalsAtRisk} tone='warning' sublabel='Renewal exposure requiring review' />
      <ExecutiveKpiCard label='AI Governance Gaps' value={data.summary.aiGovernanceGaps} tone='danger' sublabel='AI policy or ownership gaps' />
      <ExecutiveKpiCard label='Potential Annual Savings' value={money(data.summary.potentialAnnualSavings)} tone='good' sublabel='Evidence-backed value opportunity' />
      <ExecutiveKpiCard label='Evidence Confidence' value={data.summary.evidenceConfidence} tone={data.summary.evidenceConfidence === 'HIGH' ? 'good' : 'warning'} footer={<EvidenceBadge confidence={data.summary.evidenceConfidence} />} />
    </div>

    <ExecutiveSection testId='top-governance-risks' title='Top Governance Risks' description='Priority queue for leadership focus across risk exposure, accountability, renewal urgency, savings and evidence.'>
      <div style={{ overflowX:'auto' }}><div style={{ minWidth:920 }}>
        <div style={{ ...grid('.35fr 1.5fr .8fr .6fr .8fr .8fr .7fr 1fr .6fr'), color:'var(--text-tertiary)', fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'var(--border-default)', paddingBottom:9 }}><span>Rank</span><span>Issue</span><span>Domain</span><span>Risk</span><span>Risk exposure</span><span>Savings</span><span>Renewal</span><span>Leadership action</span><span>Evidence</span></div>
        {data.topRisks.map((risk, index) => <div key={risk.id} style={{ ...grid('.35fr 1.5fr .8fr .6fr .8fr .8fr .7fr 1fr .6fr'), borderBottom:'var(--border-default)', padding:'13px 0' }}><strong style={{ color:'var(--teal)' }}>#{index + 1}</strong><div><strong>{risk.title}</strong><p style={{ margin:'4px 0 0', color:'var(--text-secondary)' }}>{risk.rationale}</p></div><span>{label(risk.domain)}</span><RiskBadge level={risk.riskLevel} /><span>{money(risk.annualCostExposure)}</span><span>{money(risk.potentialAnnualSavings)}</span><span>{risk.daysToRenewal ? `${risk.daysToRenewal} days` : '—'}</span><strong>{label(risk.recommendedAction)}</strong><span>{risk.evidenceRefs.length}</span></div>)}
      </div></div>
    </ExecutiveSection>

    <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.25fr) minmax(320px, .75fr)', gap:16 }}>
      <ExecutiveSection testId='domain-breakdown' title='Domain Breakdown' description='Where executive risk is concentrated by governance domain.'>
        <ExecutiveBarChart title='Risk issues by domain' data={data.domainBreakdown.map((domain) => ({ label: label(domain.domain), value: domain.issueCount }))} />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginTop:16 }}>{data.domainBreakdown.map((domain) => <div key={domain.domain} style={{ border:'var(--border-default)', borderRadius:14, padding:12 }}><strong>{label(domain.domain)}</strong><p>Issue count: {domain.issueCount}</p><p>Critical count: {domain.criticalCount}</p><p>High count: {domain.highCount}</p><p>Exposed spend: {money(domain.exposedSpend)}</p><p>Potential savings: {money(domain.potentialSavings)}</p></div>)}</div>
      </ExecutiveSection>
      <ExecutiveSection testId='leadership-action-queue' title='Leadership Action Queue' description='Read-only leadership actions to drive accountability and governance follow-through.'>
        <div style={{ display:'grid', gap:10 }}>{actionLabels.map((action) => <div key={action.actionType} style={{ border:'var(--border-default)', borderRadius:14, padding:12, background:'rgba(255,255,255,.025)' }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><strong>{action.label}</strong><RiskBadge level={action.priority} /></div><p style={{ margin:'6px 0 0', color:'var(--text-secondary)' }}>{action.count} priorities · {action.rationale || 'Leadership action for executive review.'}</p></div>)}</div>
      </ExecutiveSection>
    </div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
      <ExecutiveSection testId='exposed-spend-value' title='Exposed Spend & Value' description='Financial exposure and evidence-backed value opportunity.'><p>Ownerless Spend: <strong>{money(data.summary.ownerlessSpend)}</strong></p><p>Renewals At Risk: <strong>{data.summary.renewalsAtRisk}</strong></p><p>Potential Annual Savings: <strong>{money(data.summary.potentialAnnualSavings)}</strong></p><p>Evidence Confidence: <strong>{data.summary.evidenceConfidence}</strong></p></ExecutiveSection>
      <ExecutiveSection testId='evidence-readiness' title='Evidence Readiness' description='Confidence level for executive recommendations.' rightSlot={<EvidenceBadge confidence={data.summary.evidenceConfidence} />}><p>Evidence-backed risks: <strong>{backed}</strong></p><p>Missing evidence: <strong>{missing}</strong></p><p><FileText size={13} /> Generate evidence recommendation for any executive review gaps.</p></ExecutiveSection>
      <ExecutiveSection testId='executive-narrative' title='Executive Narrative' description='Leadership summary for sponsor and partner conversations.'><p style={{ fontSize:16, lineHeight:1.7, margin:0 }}>{data.executiveNarrative}</p><div style={{ marginTop:12 }}><StatusBadge status='Read-only executive homepage' tone='info' /></div></ExecutiveSection>
    </div>
  </ExecutivePageShell></Shell>
}
