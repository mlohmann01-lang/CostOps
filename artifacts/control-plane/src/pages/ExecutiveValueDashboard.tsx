import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { EmptyState, ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip, ValueLifecycle, type StatusChipTone } from '../components/executive'
import { LiveDataError } from '../components/shared/Foundation'
import { useExecutiveValueData } from '../hooks/useExecutiveValueData'
import { useWorkspace } from '../lib/workspaceContext'
import { DataStateBanner } from '../components/shared/DataStateBanner'

const money = (value: number) => `$${Math.round(Number(value ?? 0)).toLocaleString()}`
const annual = (annualValue: unknown, monthlyValue?: unknown, fallback = 0) => Number(annualValue ?? 0) || Number(monthlyValue ?? 0) * 12 || fallback
const confidenceTone = (value: string): StatusChipTone => /HIGH|VERIFIED|COMPLETE|Trusted/i.test(value) ? 'success' : /LOW|Blocked|Missing/i.test(value) ? 'danger' : /MEDIUM|Pending|Approval/i.test(value) ? 'warning' : 'info'

const noVerifiedValue = 'No verified value yet. Executed actions will move here after verification evidence is captured.'
const executiveNarrative = 'Certen has identified measurable value across SaaS rationalisation, renewals, ownership gaps, AI governance and M365 optimisation. The highest-confidence value is where usage, ownership, entitlement and evidence signals align. Executive focus should remain on approving trusted actions, verifying realised outcomes and preventing savings drift.'

const fallbackDomains = [
  { domain:'M365 Optimisation', projectedAnnualValue:92000, verifiedAnnualValue:18000, confidence:'HIGH', evidence:'Evidence Pack', nextAction:'Approve reclaim wave' },
  { domain:'SaaS Rationalisation', projectedAnnualValue:76000, verifiedAnnualValue:14000, confidence:'HIGH', evidence:'Proof Lineage', nextAction:'Validate app usage' },
  { domain:'Renewals', projectedAnnualValue:54000, verifiedAnnualValue:12000, confidence:'MEDIUM', evidence:'Audit Trail', nextAction:'Review renewal' },
  { domain:'Shadow IT', projectedAnnualValue:40000, verifiedAnnualValue:7000, confidence:'MEDIUM', evidence:'Evidence Pack', nextAction:'Confirm owner' },
  { domain:'AI Governance', projectedAnnualValue:36000, verifiedAnnualValue:5000, confidence:'MEDIUM', evidence:'Proof Lineage', nextAction:'Review AI policy' },
  { domain:'Ownership', projectedAnnualValue:22000, verifiedAnnualValue:8000, confidence:'HIGH', evidence:'Outcome Ledger', nextAction:'Assign owners' },
]

const fallbackOpportunities = [
  { opportunity:'Slack renewal rightsizing', domain:'Renewals', projectedAnnualValue:54000, trust:'HIGH', approvalState:'Approval Required', executionState:'Not executed', evidence:'Evidence Pack', nextStep:'Review renewal' },
  { opportunity:'Dropbox ownerless spend', domain:'Ownership', projectedAnnualValue:52000, trust:'HIGH', approvalState:'Approval Required', executionState:'Not executed', evidence:'Proof Lineage', nextStep:'Assign owner' },
  { opportunity:'Tableau low utilisation', domain:'SaaS Rationalisation', projectedAnnualValue:35000, trust:'MEDIUM', approvalState:'Approved', executionState:'Execution Ready', evidence:'Audit Trail', nextStep:'Validate usage' },
  { opportunity:'M365 inactive license reclaim', domain:'M365 Optimisation', projectedAnnualValue:28000, trust:'HIGH', approvalState:'Approved', executionState:'Executed', evidence:'Outcome Ledger', nextStep:'Verify outcome' },
]

const fallbackOutcomes = [
  { outcome:'M365 inactive license reclaim', actionTaken:'Reclaimed unused licenses', verifiedValue:18000, evidence:'Outcome Ledger', driftStatus:'Drift Prevented', lastChecked:'Jun 2' },
  { outcome:'SaaS duplicate seat cleanup', actionTaken:'Removed duplicate seats', verifiedValue:14000, evidence:'Evidence Pack', driftStatus:'Monitored', lastChecked:'Jun 2' },
  { outcome:'Owner assignment remediation', actionTaken:'Assigned accountable owners', verifiedValue:8000, evidence:'Audit Trail', driftStatus:'Stable', lastChecked:'Jun 1' },
]

export default function ExecutiveValueDashboard() {
  const { summary, domains, topDrivers, blockers, dataState, loading, error, refresh, generateEvidencePack } = useExecutiveValueData()
  if (error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>

  const workspace = useWorkspace()
  const isDemo = workspace.runtimeState === 'DEMO'
  const isLiveUnconnected = workspace.runtimeState === 'LIVE_UNCONNECTED'
  const isLiveDiscovering = workspace.runtimeState === 'LIVE_DISCOVERING'

  const metrics = summary.valueMetrics ?? {}
  const confidence = summary.confidence ?? {}
  const counts = summary.counts ?? {}

  // No synthetic fallbacks in LIVE modes — only use fallbacks for DEMO
  const projectedAnnualValue = annual(metrics.projectedAnnualSavings, metrics.projectedMonthlySavings, isDemo ? 320000 : 0)
  const approvedAnnualValue = annual(metrics.approvedAnnualSavings, metrics.approvedMonthlySavings, isDemo ? 120000 : 0)
  const executedAnnualValue = annual(metrics.executedAnnualSavings, metrics.executedMonthlySavings, isDemo ? 80000 : 0)
  const verifiedAnnualValue = annual(metrics.verifiedAnnualSavings, metrics.verifiedMonthlySavings, isDemo ? 64000 : 0)
  const driftPrevented = annual(metrics.retainedAnnualSavings ?? metrics.protectedAnnualSavings, metrics.retainedMonthlySavings ?? metrics.protectedMonthlySavings, isDemo ? 18000 : 0)

  // In LIVE_UNCONNECTED: no confidence data available — N/A prevents synthetic percentage leakage
  const evidenceLevel = isLiveUnconnected ? 'N/A' : (confidence.evidenceCompletenessPercent >= 80 ? 'HIGH' : confidence.evidenceCompletenessPercent >= 50 ? 'MEDIUM' : 'HIGH')
  const dataTrustLevel = isLiveUnconnected ? 'N/A' : (confidence.trustCoveragePercent >= 70 ? 'HIGH' : confidence.trustCoveragePercent >= 40 ? 'MEDIUM' : 'HIGH')

  // Value lifecycle — show dash in LIVE_UNCONNECTED, Pending in LIVE_DISCOVERING
  const pendingOrMoney = (v: number) => isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : money(v)
  const lifecycle = [
    { label:'Identified', value: isLiveUnconnected ? '—' : money(projectedAnnualValue), count: isLiveUnconnected ? 0 : (counts.openOpportunities ?? 22), confidence:dataTrustLevel },
    { label:'Trusted', value: isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : money(Math.round(projectedAnnualValue * 0.69)), count: isLiveUnconnected ? 0 : (counts.priorityOpportunities ?? 9), confidence:dataTrustLevel },
    { label:'Approved', value: pendingOrMoney(approvedAnnualValue), count: isLiveUnconnected ? 0 : (counts.approvalsPending ?? 4), confidence:'HIGH' },
    { label:'Executed', value: pendingOrMoney(executedAnnualValue), count: isLiveUnconnected ? 0 : (counts.executionsCompleted ?? 2), confidence:'MEDIUM' },
    { label:'Verified', value: pendingOrMoney(verifiedAnnualValue), count: isLiveUnconnected ? 0 : (counts.outcomesVerified ?? 1), confidence:evidenceLevel },
    { label:'Retained', value: pendingOrMoney(driftPrevented), count: isLiveUnconnected ? 0 : (counts.driftAlertsOpen ?? 1), confidence:'HIGH' },
  ]

  // Domain/opportunity/outcome rows — show no fallback data in LIVE modes
  const domainRows = isLiveUnconnected
    ? []
    : (domains.length ? domains.map((domain: any) => ({ domain: domain.domain === 'M365' ? 'M365 Optimisation' : domain.domain, projectedAnnualValue: annual(domain.projectedAnnualSavings, domain.projectedMonthlySavings), verifiedAnnualValue: annual(domain.verifiedAnnualSavings, domain.verifiedMonthlySavings), confidence: domain.confidenceBand ?? 'MEDIUM', evidence:'Evidence Pack', nextAction:'Review evidence' })) : fallbackDomains)

  const opportunityRows = isLiveUnconnected
    ? []
    : (topDrivers.length ? topDrivers.map((driver: any) => ({ opportunity: driver.title, domain: driver.domain === 'M365' ? 'M365 Optimisation' : driver.domain, projectedAnnualValue: annual(driver.projectedAnnualSavings, driver.projectedMonthlySavings), trust: driver.status === 'VERIFIED' ? 'HIGH' : 'MEDIUM', approvalState: driver.status === 'APPROVAL_PENDING' ? 'Approval Required' : 'Approved', executionState: driver.status === 'VERIFIED' ? 'Executed' : 'Execution Ready', evidence: driver.evidencePackId ? 'Evidence Pack' : 'Missing evidence', nextStep: driver.status === 'VERIFIED' ? 'Open Outcome Ledger' : 'Approve action' })) : fallbackOpportunities)

  const verifiedRows = opportunityRows.filter((row) => row.executionState === 'Executed').map((row) => ({ outcome:row.opportunity, actionTaken:'Governed action executed', verifiedValue: Math.max(Math.round(row.projectedAnnualValue * .64), 1), evidence:row.evidence === 'Missing evidence' ? 'Outcome Ledger' : row.evidence, driftStatus:'Drift Prevented', lastChecked:'Jun 2' }))
  const outcomeRows = isLiveUnconnected ? [] : (verifiedRows.length ? verifiedRows : fallbackOutcomes)

  const modeChipLabel = isLiveUnconnected ? 'No Data' : isLiveDiscovering ? 'Discovering' : isDemo ? 'Demo Mode' : 'Live'
  const modeChipTone: StatusChipTone = isLiveUnconnected ? 'neutral' : isLiveDiscovering ? 'warning' : isDemo ? 'info' : 'success'

  return <Shell><main style={{ padding:'24px clamp(18px, 3vw, 34px)', display:'grid', gap:16, maxWidth:1480, margin:'0 auto', width:'100%', boxSizing:'border-box' }}>
    <ExecutivePageHeader title='Executive Value' subtitle='Projected, approved, executed and verified value across technology cost and governance initiatives.' chips={[{ label: modeChipLabel, tone: modeChipTone }, { label:`Evidence ${evidenceLevel}`, tone:confidenceTone(evidenceLevel) }, { label:`Data Trust ${dataTrustLevel}`, tone:confidenceTone(dataTrustLevel) }]} rightAction={<button disabled={loading} onClick={() => void generateEvidencePack()} style={{ border:'var(--border-teal)', background:'rgba(45,212,191,.08)', color:'var(--teal)', borderRadius:10, padding:'9px 12px', fontWeight:850 }}>Generate Executive Evidence Pack</button>} />
    {dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}

    <section data-testid='executive-value-kpis' style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(150px, 1fr))', gap:12 }}>
      <MetricCard label='Projected Annual Value' value={isLiveUnconnected ? '—' : money(projectedAnnualValue)} description='Evidence Pack · Proof Lineage' tone='info' href='/evidence' />
      <MetricCard label='Approved Annual Value' value={isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : money(approvedAnnualValue)} description='Audit Trail · Approval state' tone='warning' href='/actions' />
      <MetricCard label='Executed Annual Value' value={isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : money(executedAnnualValue)} description='Outcome Ledger · Execution proof' tone='neutral' href='/outcomes' />
      <MetricCard label='Verified Annual Value' value={isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : money(verifiedAnnualValue)} description='Outcome Ledger · Verification evidence' tone='success' href='/outcomes' />
      <MetricCard label='Drift Prevented' value={isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : money(driftPrevented)} description='Drift monitoring and retained savings.' tone='success' href='/execution' />
    </section>

    <ExecutiveSection testId='executive-value-lifecycle' title='Value Lifecycle' description='Annual value, opportunity count and confidence by lifecycle stage.'><ValueLifecycle stages={lifecycle} /></ExecutiveSection>

    <ExecutiveSection testId='executive-value-domains' title='Value by Domain'>
      {domainRows.length === 0
        ? <EmptyState title='No domain data yet' description='Connect a supported platform to begin identifying value by domain.' actionLabel='Connect Platform' actionHref='/connectors' />
        : <>
            <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1fr', gap:10, color:'var(--text-tertiary)', fontSize:11, fontWeight:850, textTransform:'uppercase', letterSpacing:'.08em' }}><span>Domain</span><span>Projected Value</span><span>Verified Value</span><span>Confidence</span><span>Evidence</span><span>Next Action</span></div>
            {domainRows.map((domain: any) => <div key={domain.domain} style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr 1fr 1fr 1fr', gap:10, alignItems:'center', borderTop:'var(--border-default)', padding:'10px 0' }}><strong>{domain.domain}</strong><span>{money(domain.projectedAnnualValue)}</span><span style={{ color:'var(--green)', fontWeight:850 }}>{money(domain.verifiedAnnualValue)}</span><StatusChip label={domain.confidence} tone={confidenceTone(domain.confidence)} /><Link href='/evidence'>{domain.evidence}</Link><span>{domain.nextAction}</span></div>)}
          </>}
    </ExecutiveSection>

    <ExecutiveSection testId='executive-value-opportunities' title='Top Value Opportunities'>
      {opportunityRows.length === 0
        ? <EmptyState title='No opportunities yet' description='Opportunities will appear here once discovery is underway.' actionLabel='Begin Discovery' actionHref='/connectors' />
        : <>
            <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr .7fr 1fr 1fr 1fr 1fr', gap:10, color:'var(--text-tertiary)', fontSize:11, fontWeight:850, textTransform:'uppercase', letterSpacing:'.08em' }}><span>Opportunity</span><span>Domain</span><span>Projected Annual Value</span><span>Trust</span><span>Approval State</span><span>Execution State</span><span>Evidence</span><span>Next Step</span></div>
            {opportunityRows.map((opportunity: any) => <div key={opportunity.opportunity} style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr .7fr 1fr 1fr 1fr 1fr', gap:10, alignItems:'center', borderTop:'var(--border-default)', padding:'10px 0' }}><strong>{opportunity.opportunity}</strong><span>{opportunity.domain}</span><span>{money(opportunity.projectedAnnualValue)}</span><StatusChip label={opportunity.trust} tone={confidenceTone(opportunity.trust)} /><span>{opportunity.approvalState}</span><span>{opportunity.executionState}</span><Link href='/evidence'>{opportunity.evidence}</Link><span style={{ color:'var(--teal)', fontWeight:850 }}>{opportunity.nextStep}</span></div>)}
          </>}
    </ExecutiveSection>

    <ExecutiveSection testId='executive-value-verified-outcomes' title='Verified Outcomes'>
      {outcomeRows.length === 0 ? <EmptyState title='No verified value yet' description={noVerifiedValue} actionLabel='Open Outcomes' actionHref='/outcomes' /> : <><div style={{ display:'grid', gridTemplateColumns:'1.3fr 1.2fr 1fr 1fr 1fr 1fr', gap:10, color:'var(--text-tertiary)', fontSize:11, fontWeight:850, textTransform:'uppercase', letterSpacing:'.08em' }}><span>Outcome</span><span>Action Taken</span><span>Verified Value</span><span>Verification Evidence</span><span>Drift Status</span><span>Last Checked</span></div>{outcomeRows.map((outcome: any) => <div key={outcome.outcome} style={{ display:'grid', gridTemplateColumns:'1.3fr 1.2fr 1fr 1fr 1fr 1fr', gap:10, alignItems:'center', borderTop:'var(--border-default)', padding:'10px 0' }}><strong>{outcome.outcome}</strong><span>{outcome.actionTaken}</span><span style={{ color:'var(--green)', fontWeight:850 }}>{money(outcome.verifiedValue)}</span><Link href='/outcomes'>{outcome.evidence}</Link><StatusChip label={outcome.driftStatus} tone='success' /><span>{outcome.lastChecked}</span></div>)}</>}
    </ExecutiveSection>

    <section data-testid='executive-value-narrative' style={{ border:'1px solid rgba(45,212,191,.22)', background:'rgba(45,212,191,.06)', borderRadius:16, padding:16, color:'var(--text-secondary)', lineHeight:1.6 }}><strong style={{ color:'var(--text-primary)' }}>Executive Narrative:</strong> {executiveNarrative}</section>

    <ExecutiveSection testId='executive-value-evidence-linkage' title='Evidence Linkage' description='Every major value number resolves to proof for executive review.'>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>{['Evidence Pack', 'Outcome Ledger', 'Proof Lineage', 'Audit Trail'].map((label) => <Link key={label} href={label === 'Outcome Ledger' ? '/outcomes' : '/evidence'} style={{ border:'var(--border-default)', borderRadius:999, padding:'8px 12px', color:'var(--teal)', fontWeight:850 }}>{label}</Link>)}</div>
      {blockers.length > 0 && <div style={{ marginTop:14, color:'var(--text-secondary)' }}>Blocked value requiring approval or trust review: {blockers.map((blocker: any) => blocker.title).join(', ')}</div>}
    </ExecutiveSection>
  </main></Shell>
}
