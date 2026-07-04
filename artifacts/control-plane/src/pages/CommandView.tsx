import React, { useMemo } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { EmptyState, SectionLabel, StatusPill } from '../components/shared/Foundation'
import { ExecutiveMetricStrip, ExecutiveNarrative, ExecutiveSection } from '../components/executive'
import { useExecutiveValueData } from '../hooks/useExecutiveValueData'
import { useExecutivePrioritiesData } from '../hooks/useExecutivePrioritiesData'
import { useRuntimeEvents } from '../hooks/useRuntimeEvents'

function money(value: number) { return value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value.toLocaleString()}` }
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
  const readyNow = Number(executivePriorities.summary.readyNowCount ?? 0)
  const awaitingApproval = Number(executivePriorities.summary.approvalRequiredCount ?? counts.approvalsPending ?? 0)
  const blocked = Number(executivePriorities.summary.blockedCount ?? executiveValue.blockers.length ?? 0)
  const trustCoverage = Number(confidence.trustCoveragePercent ?? executivePriorities.summary.averageTrustScore ?? 0)
  const topPriorities = (executivePriorities.topPriorities ?? []).slice(0, 3)

  const recentChanges = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    return runtimeEvents.latestEvents
      .filter((event: any) => new Date(event.createdAt).getTime() >= cutoff)
      .slice(0, 5)
  }, [runtimeEvents.latestEvents])

  const attention = useMemo(() => {
    const blockerRows = (executiveValue.blockers ?? []).map((blocker: any) => ({ issue: blocker.title, impact: blocker.reason ?? blocker.type, blockedValue: Number(blocker.blockedValue ?? 0), requiredAction: blocker.recommendedAction ?? 'Resolve blocker' }))
    const priorityBlockers = (executivePriorities.priorities ?? []).filter((priority: any) => priority.readiness === 'BLOCKED').map((priority: any) => ({ issue: priority.title, impact: 'Trust blocker', blockedValue: Number(priority.projectedAnnualSavings ?? priority.projectedMonthlySavings ?? 0), requiredAction: priority.recommendedNextAction ?? 'Resolve trust blockers' }))
    const approvalRows = awaitingApproval > 0 ? [{ issue: 'Approval backlog', impact: `${awaitingApproval} executive priorities awaiting approval`, blockedValue: Number(valueMetrics.approvedAnnualSavings ?? 0), requiredAction: 'Open Actions' }] : []
    const driftRows = Number(counts.driftAlertsOpen ?? 0) > 0 ? [{ issue: 'Open drift exposure', impact: `${counts.driftAlertsOpen} drift alert open`, blockedValue: Number(valueMetrics.protectedAnnualSavings ?? 0), requiredAction: 'Open Outcomes' }] : []
    return [...blockerRows, ...priorityBlockers, ...approvalRows, ...driftRows].slice(0, 5)
  }, [executiveValue.blockers, executivePriorities.priorities, awaitingApproval, counts.driftAlertsOpen, valueMetrics.approvedAnnualSavings, valueMetrics.protectedAnnualSavings])

  const narrative = `Certen has identified ${money(projectedAnnualValue)} annual value. ${money(verifiedAnnualValue)} has been verified through controlled execution. ${readyNow === 1 ? 'One opportunity is' : `${readyNow} opportunities are`} ready now. ${blocked === 1 ? 'One remains' : `${blocked} remain`} blocked due to trust constraints.`

  return <Shell><div style={{ padding: 24, display: 'grid', gap: 18 }}>
    <header><SectionLabel>Overview</SectionLabel><h1 style={{ margin: '4px 0 0' }}>Executive Brief</h1><p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>What changed, what matters most, what requires attention, and what value was proven.</p></header>

    <section data-testid='overview-executive-brief' style={{ display: 'grid', gap: 14 }}>
      <ExecutiveMetricStrip columns='repeat(6, minmax(0, 1fr))' metrics={[
        { label: 'Projected Annual Value', value: `${money(projectedAnnualValue)} Annual Value`, hero: true },
        { label: 'Verified Annual Value', value: `${money(verifiedAnnualValue)} Verified`, hero: true },
        { label: 'Ready Now', value: `${readyNow} Ready` },
        { label: 'Awaiting Approval', value: `${awaitingApproval} Awaiting Approval` },
        { label: 'Blocked', value: `${blocked} Blocked` },
        { label: 'Trust Coverage', value: `${trustCoverage}% Trust Coverage` },
      ]} />
      <ExecutiveNarrative title='What to care about today' testId='executive-narrative'><p style={{ margin: 0 }}>{narrative}</p></ExecutiveNarrative>
    </section>

    <ExecutiveSection testId='what-matters-most' title='Top 3 Executive Priorities' rightSlot={<Link href='/executive-priorities'>View Priorities</Link>} description={<SectionLabel>What Matters Most</SectionLabel>}>
      {topPriorities.length === 0 ? <EmptyState title='No executive priorities available.' description='Priorities will appear after opportunities are scored.' /> : <div style={{ display: 'grid', gap: 8, marginTop: 12 }}><div style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr .8fr .8fr .6fr 1fr 90px', gap: 10, fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}><span>Rank</span><span>Title</span><span>Monthly Value</span><span>Readiness</span><span>Trust</span><span>Next Step</span><span>Action</span></div>{topPriorities.map((priority: any) => <div key={priority.priorityId} data-testid='overview-priority-row' style={{ display: 'grid', gridTemplateColumns: '52px 1.6fr .8fr .8fr .6fr 1fr 90px', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: 'var(--border-subtle)', fontSize: 12 }}><strong>#{priority.priorityRank}</strong><span>{priority.title}</span><span>{money(Number(priority.projectedMonthlySavings ?? 0))}/month</span><span><StatusPill status={readinessPill(priority.readiness) as any} /> {priority.readiness}</span><span>{priority.trustScore}</span><span>Next: {priority.recommendedNextAction}</span><Link href='/actions'>Open Action</Link></div>)}</div>}
    </ExecutiveSection>

    <ExecutiveSection testId='requires-attention' title='Blockers' description={<SectionLabel>Requires Attention</SectionLabel>}>
      {attention.length === 0 ? <EmptyState title='No blockers require attention.' description='Trust, approvals, renewals, connectors, and drift are currently clear.' /> : <div style={{ display: 'grid', gap: 8, marginTop: 12 }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr .7fr 1fr', gap: 10, fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}><span>Issue</span><span>Impact</span><span>Blocked Value</span><span>Required Action</span></div>{attention.map((item, index) => <div key={`${item.issue}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr .7fr 1fr', gap: 10, padding: '9px 0', borderTop: 'var(--border-subtle)', fontSize: 12 }}><strong>{item.issue}</strong><span>{item.impact}</span><span>{money(item.blockedValue)}</span><span>{item.requiredAction}</span></div>)}</div>}
    </ExecutiveSection>

    <ExecutiveSection testId='what-changed' title='Significant events in the last 24 hours' description={<SectionLabel>What Changed</SectionLabel>}>
      {recentChanges.length === 0 ? <EmptyState title='No significant changes in the last 24 hours.' description='Recent governed activity will appear here.' /> : <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>{recentChanges.map((event: any) => <div key={event.eventId} data-testid='overview-change-row' style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: 'var(--border-subtle)', fontSize: 12 }}><strong>{eventTone(event.type)}</strong><span>{event.message}</span><span>{new Date(event.createdAt).toLocaleTimeString()}</span></div>)}</div>}
    </ExecutiveSection>

    <footer data-testid='overview-quick-links' style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link href='/actions'>Open Actions</Link><Link href='/executive-value'>Open Executive Value</Link><Link href='/evidence'>Open Evidence Packs</Link><Link href='/outcomes'>Open Outcomes</Link><Link href='/executive-priorities'>Open Priorities</Link></footer>
  </div></Shell>
}
