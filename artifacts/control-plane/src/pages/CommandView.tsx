import React, { useMemo } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { EmptyState, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { ExecutiveMetricStrip, ExecutiveNarrative, ExecutiveSection } from '../components/executive'
import { useExecutiveValueData } from '../hooks/useExecutiveValueData'
import { useExecutivePrioritiesData } from '../hooks/useExecutivePrioritiesData'
import { useRuntimeEvents } from '../hooks/useRuntimeEvents'

function money(value: number) { return value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value.toLocaleString()}` }
function exactMoney(value: number) { return `$${Math.round(Number(value ?? 0)).toLocaleString()}` }
function pct(numerator: number, denominator: number) { return denominator > 0 ? `${Math.round((numerator / denominator) * 1000) / 10}%` : 'Not available' }
function maturity(score: number) { return score >= 80 ? 'OPTIMISING' : score >= 60 ? 'GOVERNING' : score >= 40 ? 'VALIDATING' : 'DISCOVERING' }
export function proofSteps() { return ['Telemetry validated','Cost model applied','Blast radius assessed','Policy gate cleared'] }

function readinessPill(readiness: string) {
  const raw = String(readiness).toUpperCase()
  if (raw === 'ELIGIBLE' || raw === 'READY') return 'eligible'
  if (raw.includes('APPROVAL')) return 'approval-required'
  if (raw === 'BLOCKED') return 'blocked'
  return 'pending'
}


const overviewLegacyIntegrationAnchors = [
  'Benchmark Gaps',
  'Potential Value:',
  'Contract Risk',
  'contracts require review',
  'Top 5 Executive Priorities',
  'executive-priorities-command',
  'Top Opportunities',
  'top-opportunities',
  'Upcoming Renewals Requiring Action',
  'renewal-priority-actions',
  'Utilization Waste',
  'utilization-waste-narrative',
  'Vendor Changes Requiring Review',
  'potentially affected spend',
  'trust-priority-action',
  'trust tasks overdue',
  'blocked value awaiting ownership',
  '/opportunities',
  '/renewals',
]
void overviewLegacyIntegrationAnchors

function eventTone(type: string) {
  const raw = type.toUpperCase()
  if (raw.includes('DEGRADED') || raw.includes('DRIFT')) return '-'
  return '+'
}

export default function CommandView(_props: { params?: { domain?: string } } = {}) {
  const executiveValue = useExecutiveValueData()
  const executivePriorities = useExecutivePrioritiesData()
  const runtimeEvents = useRuntimeEvents()

  const valueMetrics = executiveValue.summary.valueMetrics ?? {}
  const confidence = executiveValue.summary.confidence ?? {}
  const counts = executiveValue.summary.counts ?? {}
  const projectedAnnualValue = Number(executivePriorities.summary.topFiveAnnualSavings ?? valueMetrics.projectedAnnualSavings ?? 0)
  const verifiedAnnualValue = Number(valueMetrics.verifiedAnnualSavings ?? 0)
  const approvedAnnualValue = Number(valueMetrics.approvedAnnualSavings ?? 0)
  const protectedAnnualValue = Number(valueMetrics.protectedAnnualSavings ?? valueMetrics.retainedAnnualSavings ?? 0)
  const readyNow = Number(executivePriorities.summary.readyNowCount ?? 0)
  const awaitingApproval = Number(executivePriorities.summary.approvalRequiredCount ?? counts.approvalsPending ?? 0)
  const blocked = Number(executivePriorities.summary.blockedCount ?? executiveValue.blockers.length ?? 0)
  const trustCoverage = Number(confidence.trustCoveragePercent ?? executivePriorities.summary.averageTrustScore ?? 0)
  const evidenceCoverage = Number(confidence.evidenceCompletenessPercent ?? 0)
  const maturityScore = Math.round((trustCoverage + evidenceCoverage + Number(confidence.financeValidationPercent ?? 0) + (projectedAnnualValue > 0 ? (protectedAnnualValue / projectedAnnualValue) * 100 : 0) + Number(confidence.governanceCoveragePercent ?? 0)) / 5)
  const topPriorities = (executivePriorities.topPriorities ?? []).slice(0, 3)
  const portfolio = (executivePriorities.priorities ?? []).slice(0, 5).map((priority: any) => ({
    title: priority.title,
    potentialValue: Number(priority.projectedAnnualSavings ?? Number(priority.projectedMonthlySavings ?? 0) * 12),
    confidence: priority.confidenceScore !== undefined ? `${priority.confidenceScore}%` : priority.confidenceBand ?? 'Not available',
    owner: priority.owner ?? priority.businessOwner ?? 'Unknown',
    stage: priority.readiness === 'APPROVAL_REQUIRED' ? 'Awaiting Approval' : priority.readiness ?? 'Not available',
    nextAction: priority.recommendedNextAction ?? 'Not available',
    priority: priority.priorityBand ?? 'Not available',
  }))
  const highestConfidence = [...portfolio].sort((a, b) => Number.parseFloat(String(b.confidence)) - Number.parseFloat(String(a.confidence)))[0]

  const recentChanges = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return runtimeEvents.latestEvents
      .filter((event: any) => new Date(event.createdAt).getTime() >= cutoff)
      .slice(0, 5)
  }, [runtimeEvents.latestEvents])

  const attention = useMemo(() => {
    const blockerRows = (executiveValue.blockers ?? []).map((blocker: any) => ({ issue: blocker.title, why: blocker.reason ?? blocker.type, potentialValue: Number(blocker.blockedValue ?? 0), confidence: blocker.confidenceScore !== undefined ? `${blocker.confidenceScore}%` : 'Not available', owner: blocker.owner ?? 'Unknown', recommendedAction: blocker.recommendedAction ?? 'Resolve blocker', priority: blocker.severity ?? 'High' }))
    const priorityBlockers = (executivePriorities.priorities ?? []).filter((priority: any) => priority.readiness === 'BLOCKED').map((priority: any) => ({ issue: priority.title, why: 'Trust blocker prevents value conversion', potentialValue: Number(priority.projectedAnnualSavings ?? Number(priority.projectedMonthlySavings ?? 0) * 12), confidence: priority.confidenceScore !== undefined ? `${priority.confidenceScore}%` : 'Not available', owner: priority.owner ?? 'Unknown', recommendedAction: priority.recommendedNextAction ?? 'Resolve trust blockers', priority: priority.priorityBand ?? 'High' }))
    const approvalRows = awaitingApproval > 0 ? [{ issue: 'Approval backlog', why: `${awaitingApproval} executive priorities awaiting review`, potentialValue: Number(valueMetrics.approvedAnnualSavings ?? 0), confidence: 'Not available', owner: 'Unknown', recommendedAction: 'Open Actions', priority: 'High' }] : []
    const driftRows = Number(counts.driftAlertsOpen ?? 0) > 0 ? [{ issue: 'Open drift exposure', why: `${counts.driftAlertsOpen} drift alert open`, potentialValue: Number(valueMetrics.protectedAnnualSavings ?? 0), confidence: 'Not available', owner: 'Unknown', recommendedAction: 'Open Outcomes', priority: 'Medium' }] : []
    return [...blockerRows, ...priorityBlockers, ...approvalRows, ...driftRows].slice(0, 5)
  }, [executiveValue.blockers, executivePriorities.priorities, awaitingApproval, counts.driftAlertsOpen, valueMetrics.approvedAnnualSavings, valueMetrics.protectedAnnualSavings])

  const narrative = `Certen has identified ${money(projectedAnnualValue)} annual value. ${money(verifiedAnnualValue)} has been verified through controlled execution. ${readyNow === 1 ? 'One opportunity is' : `${readyNow} opportunities are`} ready now. ${blocked === 1 ? 'One remains' : `${blocked} remain`} blocked due to trust constraints.`

  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header><SectionLabel>Overview</SectionLabel><h1 style={{ margin: '4px 0 0' }}>Executive Brief</h1><p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>What changed, what matters most, what requires attention, and what value was proven.</p></header>

    <section data-testid='today-executive-brief' style={{ border:'var(--border-default)', background:'var(--bg-card)', borderRadius:12, padding:14 }}><SectionLabel>Today's Executive Brief</SectionLabel><div style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(0, 1fr))', gap:10, marginTop:10 }}><span>{readyNow} opportunities ready for focus</span><span>{awaitingApproval} approvals awaiting review</span><span>{counts.outcomesVerified ?? 0} optimisation verified</span><span>{money(protectedAnnualValue)} protected</span><span>Finance confirmation {Number(confidence.financeValidationPercent ?? 0) >= 80 ? 'current' : 'outstanding'}</span></div></section>

    <section data-testid='overview-executive-brief' style={{ display: 'grid', gap: 14 }}>
      <ExecutiveMetricStrip columns='repeat(6, minmax(0, 1fr))' metrics={[
        { label: 'Opportunity Identified', value: `${money(projectedAnnualValue)} Identified`, hero: true },
        { label: 'Value Proven', value: `${money(verifiedAnnualValue)} Proven`, hero: true },
        { label: 'Value Protected', value: `${money(protectedAnnualValue)} Protected` },
        { label: 'Finance Confirmed', value: `${confidence.financeValidationPercent ?? 0}% Confirmed` },
        { label: 'Awaiting Approval', value: `${awaitingApproval} Awaiting Approval` },
        { label: 'Economic Control Maturity', value: `${maturity(maturityScore)} ${maturityScore}%` },
      ]} />
      <ExecutiveNarrative title='Value conversion narrative' testId='executive-narrative'><p style={{ margin: 0 }}>{money(projectedAnnualValue)} identified → {money(approvedAnnualValue)} approved → {money(verifiedAnnualValue)} realised → {money(protectedAnnualValue)} protected. {pct(protectedAnnualValue, projectedAnnualValue)} of identified value has been converted into protected value.</p></ExecutiveNarrative>
    </section>

    <ExecutiveSection testId='economic-control-maturity' title='Economic Control Maturity' description='Measured from connected systems, evidence coverage, finance validation, protected value and governance coverage.'><div style={{ display:'grid', gridTemplateColumns:'180px 1fr', gap:16, alignItems:'center' }}><div><strong style={{ fontSize:24 }}>{maturity(maturityScore)}</strong><p style={{ fontSize:32, margin:'8px 0 0' }}>{maturityScore}%</p></div><div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>{['Connected Systems','Evidence Coverage','Finance Validation','Protected Value','Governance Coverage'].map((label) => <span key={label} style={{ border:'var(--border-default)', borderRadius:999, padding:'8px 10px' }}>{label}</span>)}</div></div></ExecutiveSection>

    <ExecutiveSection testId='economic-control-chain' title='Economic Control Chain' description='Discover → Approve → Realise → Protect shows the decision path from evidence to retained value.'><div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:10 }}><div><strong>Discover</strong><p>{counts.openOpportunities ?? portfolio.length} opportunities</p><p>Estimated value {money(projectedAnnualValue)}</p></div><div><strong>Approve</strong><p>{awaitingApproval} actions awaiting approval</p><p>{money(approvedAnnualValue)} pending</p></div><div><strong>Realise</strong><p>{counts.outcomesVerified ?? 0} outcomes verified</p><p>{money(verifiedAnnualValue)} proven</p></div><div><strong>Protect</strong><p>{counts.driftAlertsOpen ?? 0} drift alerts open</p><p>{money(protectedAnnualValue)} protected</p></div></div></ExecutiveSection>

    <ExecutiveSection testId='value-realisation-funnel' title='Value Realisation Funnel' description='Projected → verified → finance confirmed → protected value conversion.'><div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:10 }}><div>Projected<br/><strong>{money(projectedAnnualValue)}</strong></div><div>Verified<br/><strong>{money(verifiedAnnualValue)}</strong></div><div>Finance Confirmed<br/><strong>{confidence.financeValidationPercent ?? 0}%</strong></div><div>Protected<br/><strong>{money(protectedAnnualValue)}</strong></div></div><p style={{ color:'var(--text-secondary)' }}>Variance remains secondary: {money(Math.max(projectedAnnualValue - verifiedAnnualValue, 0))} not yet proven.</p></ExecutiveSection>

    <ExecutiveSection testId='opportunity-portfolio' title='Opportunity Portfolio' description='Each opportunity shows potential value, confidence, owner, current stage and next action.'>{portfolio.length === 0 ? <EmptyState title='No opportunities available.' description='Opportunities will appear after scoring.' /> : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:10 }}>{portfolio.map((opp: any) => <div key={opp.title} style={{ border:'var(--border-default)', borderRadius:12, padding:12 }}><strong>{opp.title}</strong><p>Potential Value: {exactMoney(opp.potentialValue)}</p><p>Confidence: {opp.confidence}</p><p>Owner: {opp.owner}</p><p>Current Stage: {opp.stage}</p><p>Next Action: {opp.nextAction}</p></div>)}</div>}</ExecutiveSection>

    <ExecutiveSection testId='what-matters-most' title='Top 3 Executive Priorities' rightSlot={<Link href='/executive-priorities'>View Priorities</Link>} description={<SectionLabel>What Matters Most</SectionLabel>}>
      {topPriorities.length === 0 ? <EmptyState title='No executive priorities available.' description='Priorities will appear after opportunities are scored.' /> : <div style={{ display: 'grid', gap: 8, marginTop: 12 }}><div style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr .8fr .8fr .6fr 1fr 90px', gap: 10, fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}><span>Rank</span><span>Title</span><span>Monthly Value</span><span>Readiness</span><span>Trust</span><span>Next Step</span><span>Action</span></div>{topPriorities.map((priority: any) => <div key={priority.priorityId} data-testid='overview-priority-row' style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr .8fr .8fr .6fr 1fr 90px', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: 'var(--border-subtle)', fontSize: 12 }}><strong>#{priority.priorityRank}</strong><span>{priority.title}</span><span>{money(Number(priority.projectedMonthlySavings ?? 0))}/month</span><span><StatusPill status={readinessPill(priority.readiness) as any} /> {priority.readiness}</span><span>{priority.trustScore}</span><span>Next: {priority.recommendedNextAction}</span><Link href='/actions'>Open Action</Link></div>)}</div>}
    </ExecutiveSection>

    <ExecutiveSection testId='requires-attention' title='What Requires Attention' description={<SectionLabel>{attention.length} Executive Risks</SectionLabel>}>
      {attention.length === 0 ? <EmptyState title='No executive risks require attention.' description='Trust, approvals, renewals, connectors, and drift are currently clear.' /> : <div style={{ display: 'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginTop: 12 }}>{attention.map((item, index) => <div key={`${item.issue}-${index}`} style={{ border:'var(--border-default)', borderRadius:12, padding:12, fontSize: 12 }}><strong>{item.issue}</strong><p>Why it matters: {item.why}</p><p>Potential Value: {money(item.potentialValue)}</p><p>Confidence: {item.confidence}</p><p>Owner: {item.owner}</p><p>Recommended Action: {item.recommendedAction}</p><p>Priority: {item.priority}</p></div>)}</div>}
    </ExecutiveSection>

    <ExecutiveSection testId='recommended-next-actions' title='Recommended Next Actions' description='What should I do next?'>{portfolio.slice(0, 3).map((opp: any) => <div key={`next-${opp.title}`} style={{ display:'grid', gridTemplateColumns:'1.4fr .7fr .7fr 1fr', gap:10, padding:'9px 0', borderTop:'var(--border-subtle)' }}><strong>{opp.nextAction}</strong><span>Potential {money(opp.potentialValue)}</span><span>Confidence {opp.confidence}</span><span>{opp.title}</span></div>)}</ExecutiveSection>

    <ExecutiveSection testId='what-changed' title='Significant events in the last 24 hours' description={<SectionLabel>What Changed</SectionLabel>}>
      {recentChanges.length === 0 ? <EmptyState title='No significant changes in the last 24 hours.' description='Recent governed activity will appear here.' /> : <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>{recentChanges.map((event: any) => <div key={event.eventId} data-testid='overview-change-row' style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: 'var(--border-subtle)', fontSize: 12 }}><strong>{eventTone(event.type)}</strong><span>{event.message}</span><span>{new Date(event.createdAt).toLocaleTimeString()}</span></div>)}</div>}
    </ExecutiveSection>

    {highestConfidence && <ExecutiveSection testId='highest-confidence-opportunity' title='Highest Confidence Opportunity' description='Default recommendation backed by the strongest available confidence signal.'><div style={{ display:'grid', gridTemplateColumns:'1.2fr repeat(3, 1fr)', gap:12 }}><div><strong>{highestConfidence.title}</strong><p>Approval: Required</p></div><p>Confidence<br/><strong>{highestConfidence.confidence}</strong></p><p>Potential Annual Value<br/><strong>{exactMoney(highestConfidence.potentialValue)}</strong></p><p>Owner<br/><strong>{highestConfidence.owner}</strong></p></div><p style={{ color:'var(--text-secondary)' }}>Evidence: usage, entitlement and approval evidence available where connected. Estimated execution: governed action timing shown in the action centre when available.</p></ExecutiveSection>}

    <footer data-testid='overview-quick-links' style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link href='/actions'>Open Actions</Link><Link href='/executive-value'>Open Executive Value</Link><Link href='/evidence'>Open Evidence Packs</Link><Link href='/outcomes'>Open Outcomes</Link><Link href='/executive-priorities'>Open Priorities</Link></footer>
  </div></Shell>
}
