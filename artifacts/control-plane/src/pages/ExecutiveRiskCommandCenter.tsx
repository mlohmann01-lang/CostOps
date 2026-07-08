import React from 'react'
import { FileText } from 'lucide-react'
import { Shell } from '../components/layout/Shell'
import { EvidenceBadge, ExecutiveBarChart, ExecutiveKpiCard, ExecutiveSection, RiskBadge, StatusBadge } from '../components/executive'
import { useExecutiveRiskData } from '../hooks/useExecutiveRiskData'
// Absorbed from GovernanceView.tsx (Governance page retired, redirected here — NAV-1).
import { useGovernanceGraphData } from '../hooks/useGovernanceGraphData'

const money = (value?: number) => typeof value === 'number' ? `$${Math.round(value).toLocaleString()}` : '—'
const label = (value: string) => value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
const grid = (columns: string) => ({ display:'grid', gridTemplateColumns: columns, gap: 10, alignItems:'center' })
const govColumns = (count: number) => `repeat(${count}, minmax(0, 1fr))`
function GovRow({ cells }: { cells: React.ReactNode[] }) { return <div style={{ display: 'grid', gridTemplateColumns: govColumns(cells.length), gap: 10, border: 'var(--border-default)', borderRadius: 10, padding: 10, fontSize: 13 }}>{cells.map((cell, index) => <span key={index}>{cell}</span>)}</div> }
function GovHeader({ cells }: { cells: string[] }) { return <div style={{ display: 'grid', gridTemplateColumns: govColumns(cells.length), gap: 10, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>{cells.map((cell) => <span key={cell}>{cell}</span>)}</div> }
const executiveNarrative = 'The highest-priority governance issues are concentrated in ownerless applications, near-term renewals, AI governance exposure, and duplicate SaaS capability. Immediate attention should focus on ownership assignment, AI policy review, renewal rationalisation, and evidence-backed executive review.'
const actionOrder = ['Assign Owners', 'Review AI Policy', 'Renegotiate Renewals', 'Consolidate Vendors', 'Retire Unused Tools', 'Validate Data', 'Generate Evidence']

export default function ExecutiveRiskCommandCenter() {
  const { data } = useExecutiveRiskData()
  const graph = useGovernanceGraphData().data
  const backed = data.topRisks.filter((risk) => risk.evidenceRefs.length > 0).length
  const missing = data.topRisks.length - backed
  const exposedSpend = data.domainBreakdown.find((domain) => domain.domain === 'RENEWALS')?.exposedSpend ?? 320000
  const actionMap = new Map(data.leadershipActions.map((action) => [action.label, action]))
  const actionLabels = actionOrder.map((action, index) => actionMap.get(action) ?? { label: action, count: index < 4 ? 1 : 0, priority: index < 3 ? 'HIGH' : 'MEDIUM', actionType: action.toUpperCase().replace(/ /g, '_'), rationale: 'Leadership action for executive review.' })

  return <Shell><main style={{ padding:'18px clamp(16px, 2.4vw, 28px)', display:'grid', gap:14, maxWidth:1480, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
    <section style={{ border:'1px solid rgba(148,163,184,.18)', background:'var(--surface-1)', borderRadius:18, padding:'16px 18px', boxShadow:'0 12px 32px rgba(0,0,0,.14)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ minWidth:260, maxWidth:820 }}>
          <h1 style={{ margin:'0 0 6px', fontSize:'clamp(26px, 3vw, 34px)', lineHeight:1.05, letterSpacing:'-.035em' }}>Executive Risk</h1>
          <p style={{ margin:0, color:'var(--text-secondary)', fontSize:14, lineHeight:1.45 }}>Portfolio-level risk, exposed spend, renewal urgency and governance action priorities.</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <StatusBadge status='Demo Mode' tone='info' />
          <StatusBadge status='Execution Disabled' tone='warning' />
          <StatusBadge status='Data Trust HIGH' tone='good' />
        </div>
      </div>
    </section>

    <div data-testid='executive-risk-kpis' style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10 }}>
      <ExecutiveKpiCard label='Portfolio Risk Score' value={data.summary.portfolioRiskScore} tone='danger' sublabel='Portfolio-level governance risk' />
      <ExecutiveKpiCard label='Exposed Spend' value={money(exposedSpend)} tone='warning' sublabel='Renewal exposure requiring review' />
      <ExecutiveKpiCard label='Ownerless Spend' value={money(data.summary.ownerlessSpend)} tone='warning' sublabel='Spend without accountability' />
      <ExecutiveKpiCard label='Potential Annual Savings' value={money(data.summary.potentialAnnualSavings)} tone='good' sublabel='Evidence-backed opportunity' />
      <ExecutiveKpiCard label='Renewals at Risk' value={data.summary.renewalsAtRisk} tone='warning' sublabel='Near-term renewal decisions' />
      <ExecutiveKpiCard label='Evidence Confidence' value={data.summary.evidenceConfidence} tone={data.summary.evidenceConfidence === 'HIGH' ? 'good' : 'warning'} footer={<EvidenceBadge confidence={data.summary.evidenceConfidence} />} />
    </div>

    <section data-testid='executive-narrative' style={{ border:'1px solid rgba(45,212,191,.22)', background:'rgba(45,212,191,.06)', borderRadius:16, padding:'13px 15px', color:'var(--text-secondary)', lineHeight:1.55 }}>
      <strong style={{ color:'var(--text-primary)' }}>Executive narrative:</strong> {executiveNarrative}
    </section>

    <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.45fr) minmax(300px, .55fr)', gap:14, alignItems:'start' }}>
      <ExecutiveSection testId='top-governance-risks' title='Top Governance Risks' description='Priority queue for leadership focus across risk exposure, accountability, renewal urgency, savings and evidence.'>
        <div style={{ overflowX:'auto' }}><div style={{ minWidth:920 }}>
          <div style={{ ...grid('.35fr 1.5fr .8fr .6fr .75fr .75fr .65fr 1fr .55fr'), color:'var(--text-tertiary)', fontSize:10, textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'var(--border-default)', paddingBottom:7 }}><span>Rank</span><span>Issue</span><span>Domain</span><span>Risk</span><span>Exposure</span><span>Savings</span><span>Renewal</span><span>Leadership Action</span><span>Evidence</span></div>
          {data.topRisks.map((risk, index) => <div key={risk.id} style={{ ...grid('.35fr 1.5fr .8fr .6fr .75fr .75fr .65fr 1fr .55fr'), borderBottom:'var(--border-default)', padding:'10px 0', fontSize:12 }}><strong style={{ color:'var(--teal)' }}>#{index + 1}</strong><div><strong style={{ fontSize:13 }}>{risk.title}</strong><p style={{ margin:'3px 0 0', color:'var(--text-secondary)', lineHeight:1.35 }}>{risk.rationale}</p></div><span>{label(risk.domain)}</span><RiskBadge level={risk.riskLevel} /><span>{money(risk.annualCostExposure)}</span><span>{money(risk.potentialAnnualSavings)}</span><span>{risk.daysToRenewal ? `${risk.daysToRenewal} days` : '—'}</span><strong>{label(risk.recommendedAction)}</strong><span>{risk.evidenceRefs.length}</span></div>)}
        </div></div>
      </ExecutiveSection>

      <ExecutiveSection testId='leadership-action-queue' title='Leadership Action Queue' description='Read-only leadership actions to drive accountability.'>
        <div style={{ display:'grid', gap:8 }}>{actionLabels.map((action) => <div key={action.actionType} style={{ border:'var(--border-default)', borderRadius:12, padding:10, background:'rgba(255,255,255,.025)' }}><div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center' }}><strong>{action.label}</strong><RiskBadge level={action.priority} /></div><p style={{ margin:'5px 0 0', color:'var(--text-secondary)', fontSize:12, lineHeight:1.4 }}>{action.count} priorities · {action.rationale || 'Leadership action for executive review.'}</p></div>)}</div>
      </ExecutiveSection>
    </div>

    <ExecutiveSection testId='domain-breakdown' title='Risk by Domain' description='Economic exposure first, with issue counts as secondary context.'>
      <ExecutiveBarChart title='Exposed spend by domain' data={data.domainBreakdown.map((domain) => ({ label: label(domain.domain), value: domain.exposedSpend }))} valuePrefix='$' />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginTop:14 }}>{data.domainBreakdown.map((domain) => <div key={domain.domain} style={{ border:'var(--border-default)', borderRadius:12, padding:11, background:'rgba(255,255,255,.018)' }}><strong>{label(domain.domain)}</strong><p style={{ margin:'8px 0 3px', fontSize:18, color:'var(--teal)' }}>{money(domain.exposedSpend)}</p><p style={{ margin:0, color:'var(--text-secondary)', fontSize:12 }}>{domain.issueCount} issues · {domain.highCount} high risk</p>{domain.potentialSavings > 0 && <p style={{ margin:'4px 0 0', color:'var(--green)', fontSize:12 }}>Savings: {money(domain.potentialSavings)}</p>}</div>)}</div>
    </ExecutiveSection>

    <ExecutiveSection testId='evidence-readiness' title='Evidence Readiness' description='Confidence level for executive recommendations.' rightSlot={<EvidenceBadge confidence={data.summary.evidenceConfidence} />}><p>Evidence-backed risks: <strong>{backed}</strong></p><p>Missing evidence: <strong>{missing}</strong></p><p><FileText size={13} /> Generate evidence recommendation for any executive review gaps.</p></ExecutiveSection>

    <ExecutiveSection testId='governance-graph-summary' title='Governance Summary' description='Applications, risks, opportunities and evidence coverage across the governed estate. Absorbed from Governance.'>
      <div style={{ display: 'grid', gap: 10 }}>
        <GovHeader cells={['Metric', 'Value', 'Outcome']} />
        {[
          ['Applications', graph.summary?.applications, 'Estate mapped'],
          ['Risks', graph.summary?.risks, 'Requires governance'],
          ['Opportunities', graph.summary?.opportunities, 'Value path'],
          ['Evidence Items', graph.summary?.evidenceItems, 'Proof available'],
        ].map((cells) => <GovRow key={String(cells[0])} cells={cells} />)}
      </div>
    </ExecutiveSection>
  </main></Shell>
}
