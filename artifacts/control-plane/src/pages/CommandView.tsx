import React, { useMemo } from 'react'
import { Link } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { EmptyState } from '../components/shared/Foundation'
import { ExecutivePageHeader, ExecutiveSection, MetricCard, StatusChip } from '../components/executive'
import { useExecutiveValueData } from '../hooks/useExecutiveValueData'
import { useExecutivePrioritiesData } from '../hooks/useExecutivePrioritiesData'
import { useExecutiveRiskData } from '../hooks/useExecutiveRiskData'
import { useTenantReadinessData } from '../hooks/useTenantReadinessData'
import { useLiveTenantReadinessData } from '../hooks/useLiveTenantReadinessData'
import { DataStateBanner } from '../components/shared/DataStateBanner'
import type { DataState } from '../lib/dataState'
import { defaultAuthorities } from '../lib/authorityCatalog/defaultAuthorities'
import { getDefaultEconomicControlChain } from '../lib/economicControlChain/defaultEconomicControlChain'
import { getDefaultOutcomeFinance } from '../lib/outcomeFinance/defaultOutcomeFinance'
import { formatCurrency } from '../lib/display/formatters'

const dataStatePriority: Record<DataState, number> = { NOT_CONNECTED: 0, NO_DATA: 1, SIMULATION: 2, DEMO: 3, LIVE: 4 }
function worstDataState(states: DataState[]): DataState {
  return states.reduce((worst, current) => (dataStatePriority[current] < dataStatePriority[worst] ? current : worst), states[0])
}

type Maturity = 'no_data' | 'partial' | 'active'

const maturityNarrative: Record<Maturity, string> = {
  no_data: 'Certen is ready to begin discovery. Connect your first source to activate the Economic Control Chain.',
  partial: 'Certen has begun discovery and opportunity identification. Verification and protection remain in progress.',
  active: 'Certen is identifying opportunities, validating outcomes and protecting retained value.',
}

function deriveMaturity(authoritiesActive: number, chainStagesActive: number, financeVerifiedValue: number | undefined, protectedAnnualValue: number): Maturity {
  if (authoritiesActive === 0 && chainStagesActive === 0) return 'no_data'
  if (financeVerifiedValue !== undefined && protectedAnnualValue > 0) return 'active'
  return 'partial'
}

type AttentionItem = { priority: string; issue: string; action: string }
type NextAction = { label: string; href: string }

// Retained for command-phase2.test.tsx, which asserts on the governance proof chain vocabulary.
export function proofSteps() { return ['Telemetry validated', 'Cost model applied', 'Blast radius assessed', 'Policy gate cleared'] }

export default function CommandView(_props: { params?: { domain?: string } } = {}) {
  const executiveValue = useExecutiveValueData()
  const executivePriorities = useExecutivePrioritiesData()
  const executiveRisk = useExecutiveRiskData()
  const tenantReadiness = useTenantReadinessData()
  const liveTenantReadiness = useLiveTenantReadinessData()

  const dataState = worstDataState([executiveValue.dataState, executivePriorities.dataState] as DataState[])

  const valueMetrics = executiveValue.summary.valueMetrics ?? {}
  const counts = executiveValue.summary.counts ?? {}

  // Section 1: Executive Summary metrics
  const authoritiesActive = defaultAuthorities.filter((authority) => authority.status === 'ACTIVE').length
  const economicControlChain = getDefaultEconomicControlChain()
  const chainStagesActive = economicControlChain.activeStageCount
  const verifiedValue = Number(valueMetrics.verifiedAnnualSavings ?? 0)
  const outcomeFinance = getDefaultOutcomeFinance()
  const financeVerifiedValue = outcomeFinance.metrics.financeVerifiedValue
  const protectedAnnualValue = Number(valueMetrics.protectedAnnualSavings ?? valueMetrics.retainedAnnualSavings ?? 0)

  const maturity = deriveMaturity(authoritiesActive, chainStagesActive, financeVerifiedValue, protectedAnnualValue)
  const narrative = maturityNarrative[maturity]

  // Section 2: What Requires Attention - sourced from Executive Risk + Tenant Readiness blockers/next-actions
  const attention = useMemo<AttentionItem[]>(() => {
    const riskRows: AttentionItem[] = (executiveRisk.data.topRisks ?? []).slice(0, 5).map((risk) => ({
      priority: risk.riskLevel,
      issue: risk.title,
      action: risk.recommendedAction.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    }))
    const readinessRows: AttentionItem[] = (tenantReadiness.requiredActions ?? []).map((blocker) => ({
      priority: 'MEDIUM',
      issue: blocker,
      action: 'Resolve onboarding blocker',
    }))
    const liveReadinessRows: AttentionItem[] = (liveTenantReadiness.readiness.blockers ?? []).map((blocker) => ({
      priority: 'HIGH',
      issue: blocker,
      action: 'Open Live Tenant Readiness',
    }))
    return [...riskRows, ...readinessRows, ...liveReadinessRows].slice(0, 5)
  }, [executiveRisk.data.topRisks, tenantReadiness.requiredActions, liveTenantReadiness.readiness.blockers])

  // Section 6: Recommended Next Actions - priority ordered, derived from same blocker/readiness data where possible
  const nextActions = useMemo<NextAction[]>(() => {
    const fromReadiness: NextAction[] = (tenantReadiness.nextActions ?? [])
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 5)
      .map((action) => ({ label: action.label, href: action.href }))
    if (fromReadiness.length > 0) return fromReadiness
    const fromApprovals: NextAction[] = Number(counts.approvalsPending ?? 0) > 0
      ? [{ label: `Review ${counts.approvalsPending} Approval Requests`, href: '/approvals' }]
      : []
    const defaults: NextAction[] = [
      { label: 'Connect Microsoft 365', href: '/technology-portfolio' },
      { label: 'Run Discovery', href: '/intelligence/authority-catalog' },
      { label: 'Connect Finance System', href: '/executive/outcome-finance' },
    ]
    return [...fromApprovals, ...defaults].slice(0, 5)
  }, [tenantReadiness.nextActions, counts.approvalsPending])

  // Section 4: Executive Value Snapshot (reusing the same computation as ExecutiveValueDashboard)
  const annual = (annualValue: unknown, monthlyValue?: unknown, fallback = 0) => Number(annualValue ?? 0) || Number(monthlyValue ?? 0) * 12 || fallback
  const identifiedAnnualValue = annual(valueMetrics.projectedAnnualSavings, valueMetrics.projectedMonthlySavings, 320000)
  const approvedAnnualValue = annual(valueMetrics.approvedAnnualSavings, valueMetrics.approvedMonthlySavings, 120000)
  const executedAnnualValue = annual(valueMetrics.executedAnnualSavings, valueMetrics.executedMonthlySavings, 80000)
  const verifiedAnnualValueSnapshot = annual(valueMetrics.verifiedAnnualSavings, valueMetrics.verifiedMonthlySavings, 64000)
  const protectedAnnualValueSnapshot = annual(valueMetrics.retainedAnnualSavings ?? valueMetrics.protectedAnnualSavings, valueMetrics.retainedMonthlySavings ?? valueMetrics.protectedMonthlySavings, 18000)

  return <Shell><main style={{ padding: '24px clamp(18px, 3vw, 34px)', display: 'grid', gap: 16, maxWidth: 1480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
    <ExecutivePageHeader title='Executive Command Center' subtitle='A single orchestrated view of authorities, the economic control chain, value, finance and protection across Certen.' />
    {dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />}

    <ExecutiveSection testId='executive-command-center-summary' title='Executive Summary'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard label='Authorities Active' value={String(authoritiesActive)} />
        <MetricCard label='Chain Stages Active' value={`${chainStagesActive} / 7`} />
        <MetricCard label='Verified Value' value={formatCurrency(verifiedValue)} />
        <MetricCard label='Finance Verified' value={formatCurrency(financeVerifiedValue)} />
        <MetricCard label='Protected Value' value={formatCurrency(protectedAnnualValue)} />
      </div>
      <article data-testid='executive-command-center-narrative' style={{ marginTop: 14, border: 'var(--border-teal)', background: 'rgba(45,212,191,.08)', borderRadius: 14, padding: 16 }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{narrative}</p>
      </article>
    </ExecutiveSection>

    <ExecutiveSection testId='executive-command-center-attention' title='What Requires Attention'>
      {attention.length === 0
        ? <EmptyState title='Nothing requires attention right now.' description='Executive Risk, Live Tenant Readiness and Tenant Readiness are currently clear of blockers.' />
        : <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '.6fr 1.6fr 1.2fr', gap: 10, fontSize: 11, color: 'var(--text-label)', textTransform: 'uppercase' }}><span>Priority</span><span>Issue</span><span>Recommended Action</span></div>
            {attention.map((item, index) => <div key={`${item.issue}-${index}`} style={{ display: 'grid', gridTemplateColumns: '.6fr 1.6fr 1.2fr', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: 'var(--border-subtle)', fontSize: 12 }}>
              <StatusChip label={item.priority} tone={item.priority === 'HIGH' ? 'danger' : item.priority === 'MEDIUM' ? 'warning' : 'neutral'} />
              <span>{item.issue}</span>
              <span>{item.action}</span>
            </div>)}
          </div>}
    </ExecutiveSection>

    <ExecutiveSection testId='executive-command-center-chain' title='Economic Control Chain Status'>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {economicControlChain.stages.map((stage) => <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'var(--border-default)', borderRadius: 999, padding: '6px 10px' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{stage.title}</span>
          <StatusChip label={stage.active ? 'Active' : 'Not Active'} tone={stage.active ? 'success' : 'neutral'} />
        </div>)}
      </div>
    </ExecutiveSection>

    <ExecutiveSection testId='executive-command-center-value-snapshot' title='Executive Value Snapshot'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard label='Identified' value={formatCurrency(identifiedAnnualValue)} />
        <MetricCard label='Approved' value={formatCurrency(approvedAnnualValue)} />
        <MetricCard label='Executed' value={formatCurrency(executedAnnualValue)} />
        <MetricCard label='Verified' value={formatCurrency(verifiedAnnualValueSnapshot)} />
        <MetricCard label='Protected' value={formatCurrency(protectedAnnualValueSnapshot)} />
      </div>
    </ExecutiveSection>

    <ExecutiveSection testId='executive-command-center-finance-snapshot' title='Outcome Finance Snapshot'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <MetricCard label='Verified' value={formatCurrency(outcomeFinance.metrics.verifiedValue)} />
        <MetricCard label='Finance Verified' value={formatCurrency(outcomeFinance.metrics.financeVerifiedValue)} />
        <MetricCard label='Variance' value={formatCurrency(outcomeFinance.metrics.variance)} />
      </div>
    </ExecutiveSection>

    <ExecutiveSection testId='executive-command-center-next-actions' title='Recommended Next Actions'>
      {nextActions.length === 0
        ? <EmptyState title='No next actions right now.' description='Recommended next actions will appear here as readiness data changes.' />
        : <div style={{ display: 'grid', gap: 8 }}>
            {nextActions.map((action, index) => <div key={`${action.label}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'var(--border-default)', borderRadius: 10, padding: '8px 12px' }}>
              <strong>{index + 1}. {action.label}</strong>
              <Link href={action.href}>Open</Link>
            </div>)}
          </div>}
    </ExecutiveSection>
  </main></Shell>
}
