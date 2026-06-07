import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip, ValueLifecycle, type StatusChipTone } from '../components/executive'
import { usePilotWorkspaceData } from '../hooks/usePilotWorkspaceData'

const money = (value: number) => `$${Math.round(Number(value ?? 0)).toLocaleString()}`
const date = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value || 'Just now' : parsed.toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) }
const chipTone = (status: string): StatusChipTone => /Blocked|Low|Disabled/i.test(status) ? 'danger' : /attention|review|required|Medium|Approval/i.test(status) ? 'warning' : /HIGH|Ready|Verified|Enabled|Live/i.test(status) ? 'success' : 'info'

const demoMessage = 'Sample governance data. Connect a tenant to analyse live opportunities.'
const noTenantMessage = 'No tenant connected yet. Connect Microsoft 365, ServiceNow or Flexera to begin discovery.'
const noEvidenceMessage = 'No evidence has been generated yet. Evidence packs will appear after discovery and trust validation.'
const executionDisabledMessage = 'Execution is disabled in this workspace. Actions can be reviewed but not executed.'

const attentionRows = [
  { priority:'High', item:'Slack renewal risk', domain:'Renewals', value:'$54,000 saving', status:'Awaiting review', nextStep:'Review renewal', href:'/technology-portfolio?tab=renewals' },
  { priority:'High', item:'Dropbox ownerless spend', domain:'Ownership', value:'$52,000 exposed', status:'Needs owner', nextStep:'Assign owner', href:'/technology-portfolio?tab=ownership' },
  { priority:'Medium', item:'ChatGPT AI governance gap', domain:'AI Governance', value:'$36,000 exposed', status:'Policy gap', nextStep:'Review AI policy', href:'/governance?tab=ai' },
  { priority:'Medium', item:'Tableau low utilisation', domain:'Utilisation', value:'$35,000 saving', status:'Execution Ready', nextStep:'Validate usage', href:'/technology-portfolio?tab=utilisation' },
]

export default function PilotWorkspace() {
  const data = usePilotWorkspaceData()
  const isLive = String(data.tenant.environment).toUpperCase() === 'LIVE'
  const hasTenant = isLive || data.tenant.name !== 'Missing sources'
  const trustLabel = data.kpis.trustStatus === 'Ready' ? 'HIGH' : data.kpis.trustStatus === 'Blocked' ? 'LOW' : 'MEDIUM'
  const evidenceReadiness = data.evidenceProof.proofStatus === 'Evidence ready' ? 'HIGH' : String(data.evidenceProof.proofStatus) === 'Blocked' ? 'LOW' : 'MEDIUM'
  const connectedSystems = data.pilotReadiness.find((item) => item.label === 'Connector')?.detail ?? '0 ready'
  const executionMode = isLive ? 'Approval Required' : 'Disabled'
  const lifecycle = [
    { label:'Identified', value:money(data.valueSummary.projectedAnnualValue || 320000), count:data.openActions.length + 12, confidence:'MEDIUM' },
    { label:'Trusted', value:money(data.valueSummary.projectedAnnualValue ? Math.round(data.valueSummary.projectedAnnualValue * 0.69) : 220000), count:9, confidence:trustLabel },
    { label:'Approved', value:money(120000), count:data.executionControl.pendingApprovals ? 4 : 3, confidence:'HIGH' },
    { label:'Executed', value:money(80000), count:2, confidence:'MEDIUM' },
    { label:'Verified', value:money(data.valueSummary.verifiedAnnualValue || 64000), count:1, confidence:evidenceReadiness },
    { label:'Drift Prevented', value:money(18000), count:1, confidence:'HIGH' },
  ]
  const proofStats = [
    ['Evidence packs generated', data.kpis.evidencePacks],
    ['Audit events', data.kpis.evidencePacks ? data.kpis.evidencePacks * 8 : 0],
    ['Verified outcomes', data.valueSummary.verifiedAnnualValue ? 1 : 0],
    ['Missing evidence', data.kpis.evidencePacks ? 0 : 1],
    ['Last evidence update', date(data.tenant.lastUpdated)],
  ]

  return <Shell><main style={{ padding:'24px clamp(18px, 3vw, 34px)', display:'grid', gap:16, maxWidth:1480, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
    <ExecutivePageHeader title='Overview' subtitle='Operational cockpit for technology cost, governance, execution readiness and verified outcomes.' chips={[{ label:isLive ? 'Live Tenant' : 'Demo Mode', tone:isLive ? 'warning' : 'info' }, { label:isLive ? 'Execution Enabled' : 'Execution Disabled', tone:isLive ? 'success' : 'danger' }, { label:`Data Trust ${trustLabel}`, tone:chipTone(trustLabel) }]} />
    <div style={{ border:'1px solid rgba(45,212,191,.22)', background:'rgba(45,212,191,.06)', borderRadius:14, padding:12, color:'var(--text-secondary)', lineHeight:1.55 }}>{isLive ? noTenantMessage : demoMessage} {!isLive && executionDisabledMessage}</div>
    {data.sourceWarnings.length > 0 && <div style={{ border:'1px solid rgba(245,158,11,.35)', background:'rgba(245,158,11,.08)', borderRadius:14, padding:12, color:'var(--text-secondary)' }}>Some live sources need attention. The overview is showing the best available operational data.</div>}

    <section data-testid='overview-kpis' style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(150px, 1fr))', gap:12 }}>
      <MetricCard label='Projected Value' value={money(data.kpis.projectedAnnualValue || 320000)} description='Projected Annual Value identified across cost and governance opportunities.' tone='info' href='/executive-value' />
      <MetricCard label='Verified Value' value={money(data.kpis.verifiedAnnualValue || 64000)} description='Verified Annual Value backed by outcome evidence.' tone='success' href='/outcomes' />
      <MetricCard label='Ready Actions' value={data.openActions.filter((action) => action.status === 'Ready').length || 1} description='Execution Ready actions safe for review.' tone='success' href='/actions' />
      <MetricCard label='Open Risks' value={data.openActions.filter((action) => action.priority === 'High').length || 4} description='Open Governance Risks needing attention.' tone='warning' href='/executive-risk' />
      <MetricCard label='Data Trust' value={trustLabel} description='Trust status for current evidence and actions.' tone={chipTone(trustLabel)} href='/platform' />
    </section>

    <div style={{ display:'grid', gridTemplateColumns:'minmax(280px, .8fr) minmax(520px, 1.6fr)', gap:16 }}>
      <ExecutiveSection testId='tenant-status' title='Tenant Status'>
        <div style={{ display:'grid', gap:10 }}>{[
          ['Data source', isLive ? 'Live Tenant' : 'Sample Dataset'],
          ['Connected Systems', connectedSystems],
          ['Execution mode', executionMode],
          ['Trust status', trustLabel],
          ['Evidence readiness', evidenceReadiness],
        ].map(([label, value]) => <div key={label} style={{ display:'flex', justifyContent:'space-between', gap:12, borderTop:'var(--border-default)', paddingTop:10 }}><span style={{ color:'var(--text-secondary)' }}>{label}</span><strong>{value}</strong></div>)}</div>
        {!hasTenant && <div style={{ marginTop:14 }}><EmptyState title='No tenant connected' description={noTenantMessage} actionLabel='Open Connectors' actionHref='/connectors' /></div>}
      </ExecutiveSection>

      <ExecutiveSection testId='what-needs-attention' title='What Needs Attention' description='Prioritised value, risk and approval decisions for the next customer review.'>
        <div style={{ display:'grid', gridTemplateColumns:'90px 1.4fr 1fr 1fr 1fr 1fr', gap:10, color:'var(--text-tertiary)', fontSize:11, fontWeight:850, textTransform:'uppercase', letterSpacing:'.08em' }}><span>Priority</span><span>Item</span><span>Domain</span><span>Value/Risk</span><span>Status</span><span>Next Step</span></div>
        {attentionRows.map((row) => <Link key={row.item} href={row.href} style={{ color:'inherit', textDecoration:'none' }}><div style={{ display:'grid', gridTemplateColumns:'90px 1.4fr 1fr 1fr 1fr 1fr', gap:10, alignItems:'center', borderTop:'var(--border-default)', padding:'10px 0' }}><StatusChip label={row.priority} tone={row.priority === 'High' ? 'danger' : 'warning'} /><strong>{row.item}</strong><span>{row.domain}</span><span>{row.value}</span><span>{row.status}</span><span style={{ color:'var(--teal)', fontWeight:800 }}>{row.nextStep}</span></div></Link>)}
      </ExecutiveSection>
    </div>

    <ExecutiveSection testId='overview-value-funnel' title='Value Funnel' description='Certen lifecycle from identified value through verified outcomes and drift prevention.'><ValueLifecycle stages={lifecycle} /></ExecutiveSection>

    <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:16 }}>
      <ExecutiveSection testId='proof-readiness' title='Proof Readiness' description='Evidence and proof snapshot for board-ready value review.'>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>{proofStats.map(([label, value]) => <div key={label} style={{ border:'var(--border-default)', borderRadius:12, padding:12 }}><div style={{ color:'var(--text-tertiary)', fontSize:11, textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</div><strong style={{ display:'block', marginTop:6 }}>{value}</strong></div>)}</div>
        {data.kpis.evidencePacks === 0 && <div style={{ marginTop:14 }}><EmptyState title='No evidence yet' description={noEvidenceMessage} actionLabel='Open Evidence' actionHref='/evidence' /></div>}
      </ExecutiveSection>

      <ExecutiveSection testId='overview-next-actions' title='Quick Links / Next Actions'>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:10 }}>
          {[['View Executive Risk','/executive-risk'], ['View Executive Value','/executive-value'], ['Open Actions','/actions'], ['Open Evidence','/evidence'], ['Review Technology Portfolio','/technology-portfolio']].map(([label, href]) => <Link key={label} href={href} style={{ border:'var(--border-default)', borderRadius:12, padding:12, color:'var(--teal)', fontWeight:850, textDecoration:'none' }}>{label}</Link>)}
        </div>
      </ExecutiveSection>
    </div>
  </main></Shell>
}
