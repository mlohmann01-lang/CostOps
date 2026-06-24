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
import { useWorkspace } from '../lib/workspaceContext'

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

export function proofSteps() { return ['Telemetry validated', 'Cost model applied', 'Blast radius assessed', 'Policy gate cleared'] }

const ONBOARDING_ACTIONS: NextAction[] = [
  { label: 'Connect Microsoft 365', href: '/technology-portfolio' },
  { label: 'Run Tenant Readiness', href: '/intelligence/authority-catalog' },
  { label: 'Begin Discovery', href: '/connectors' },
]

export function CommandViewBody() {
  const executiveValue = useExecutiveValueData()
  const executivePriorities = useExecutivePrioritiesData()
  const executiveRisk = useExecutiveRiskData()
  const tenantReadiness = useTenantReadinessData()
  const liveTenantReadiness = useLiveTenantReadinessData()
  const workspace = useWorkspace()
  const runtimeState = workspace.runtimeState
  const isDemo = runtimeState === 'DEMO'
  const isLiveUnconnected = runtimeState === 'LIVE_UNCONNECTED'
  const isLiveDiscovering = runtimeState === 'LIVE_DISCOVERING'

  const dataState = worstDataState([executiveValue.dataState, executivePriorities.dataState] as DataState[])

  const valueMetrics = executiveValue.summary.valueMetrics ?? {}
  const counts = executiveValue.summary.counts ?? {}

  const authoritiesActive = isLiveUnconnected ? 0 : defaultAuthorities.filter((authority) => authority.status === 'ACTIVE').length
  const economicControlChain = getDefaultEconomicControlChain()
  const chainStagesActive = isLiveUnconnected ? 0 : economicControlChain.activeStageCount
  const verifiedValue = Number(valueMetrics.verifiedAnnualSavings ?? 0)
  const outcomeFinance = getDefaultOutcomeFinance()
  const financeVerifiedValue = outcomeFinance.metrics.financeVerifiedValue
  const protectedAnnualValue = Number(valueMetrics.protectedAnnualSavings ?? valueMetrics.retainedAnnualSavings ?? 0)

  const maturity = deriveMaturity(authoritiesActive, chainStagesActive, financeVerifiedValue, protectedAnnualValue)
  const narrative = isLiveUnconnected
    ? 'Connect a supported platform to begin discovery. Once connected, Certen will identify, quantify and govern cost opportunities across your tenant.'
    : maturityNarrative[maturity]

  const attention = useMemo<AttentionItem[]>(() => {
    if (isLiveUnconnected) return []
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
  }, [isLiveUnconnected, executiveRisk.data.topRisks, tenantReadiness.requiredActions, liveTenantReadiness.readiness.blockers])

  const nextActions = useMemo<NextAction[]>(() => {
    if (isLiveUnconnected) return ONBOARDING_ACTIONS
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
  }, [isLiveUnconnected, tenantReadiness.nextActions, counts.approvalsPending])

  const annual = (annualValue: unknown, monthlyValue?: unknown, fallback = 0) =>
    Number(annualValue ?? 0) || Number(monthlyValue ?? 0) * 12 || (isDemo ? fallback : 0)

  const identifiedAnnualValue = annual(valueMetrics.projectedAnnualSavings, valueMetrics.projectedMonthlySavings, 320000)
  const approvedAnnualValue = annual(valueMetrics.approvedAnnualSavings, valueMetrics.approvedMonthlySavings, 120000)
  const executedAnnualValue = annual(valueMetrics.executedAnnualSavings, valueMetrics.executedMonthlySavings, 80000)
  const verifiedAnnualValueSnapshot = annual(valueMetrics.verifiedAnnualSavings, valueMetrics.verifiedMonthlySavings, 64000)
  const protectedAnnualValueSnapshot = annual(valueMetrics.retainedAnnualSavings ?? valueMetrics.protectedAnnualSavings, valueMetrics.retainedMonthlySavings ?? valueMetrics.protectedMonthlySavings, 18000)

  const fmtOrDash = (v: number) => isLiveUnconnected ? '—' : formatCurrency(v)
  const fmtOrPending = (v: number) => isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : formatCurrency(v)
  const fmtFinance = (v: number | undefined) => isLiveUnconnected ? '—' : formatCurrency(v)

  const waterfallData = [
    { label: 'Identified', value: identifiedAnnualValue, color: 'var(--accent)' },
    { label: 'Approved', value: approvedAnnualValue, color: 'var(--accent)' },
    { label: 'Executed', value: executedAnnualValue, color: 'var(--accent-bright)' },
    { label: 'Verified', value: verifiedAnnualValueSnapshot, color: 'var(--success)' },
    { label: 'Protected', value: protectedAnnualValueSnapshot, color: 'var(--success)' }
  ]
  const maxVal = Math.max(...waterfallData.map(d => d.value), 1)

  return <main data-testid='command-view-body' style={{ padding: '32px clamp(20px, 4vw, 40px)', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
    <ExecutivePageHeader title='Executive Command Center' subtitle='A single orchestrated view of authorities, the economic control chain, value, finance and protection across Certen.' />
    
    {isLiveUnconnected
      ? <article data-testid='live-unconnected-notice' style={{ border: '1px solid var(--border-default)', background: 'var(--surface-2)', borderRadius: 16, padding: 24 }}>
          <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>No production systems connected.</strong>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>Connect Microsoft 365 or another supported platform to begin discovery.</p>
        </article>
      : (dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />)}

    <ExecutiveSection testId='executive-command-center-summary' title='Executive Summary'>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ border: '1px solid var(--border-gold)', background: 'var(--surface-1)', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(212,160,23,0.05)' }}>
          <div style={{ color: 'var(--accent-bright)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Authorities Active</div>
          <div style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{authoritiesActive}</div>
        </div>
        <div style={{ border: '1px solid var(--border-gold)', background: 'var(--surface-1)', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(212,160,23,0.05)' }}>
          <div style={{ color: 'var(--accent-bright)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Chain Stages Active</div>
          <div style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{chainStagesActive + ' / 7'}</div>
        </div>
        <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Verified Value</div>
          <div style={{ marginTop: 12, color: 'var(--success)', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{fmtOrDash(verifiedValue)}</div>
        </div>
        <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Finance Verified</div>
          <div style={{ marginTop: 12, color: 'var(--success)', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{fmtFinance(financeVerifiedValue)}</div>
        </div>
        <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Protected Value</div>
          <div style={{ marginTop: 12, color: 'var(--success)', fontSize: 36, fontWeight: 800, letterSpacing: '-1px' }}>{fmtOrDash(protectedAnnualValue)}</div>
        </div>
      </div>
      <article data-testid='executive-command-center-narrative' style={{ marginTop: 24, border: '1px solid var(--border-gold)', background: 'var(--accent-soft)', borderRadius: 16, padding: 20 }}>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>{narrative}</p>
      </article>
    </ExecutiveSection>

    <ExecutiveSection testId='executive-command-center-chain' title='Economic Control Chain Status'>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', background: 'var(--surface-0)', borderRadius: 16, border: '1px solid var(--border-default)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: 60, right: 60, height: 2, background: 'var(--border-default)', zIndex: 0, transform: 'translateY(-50%)' }} />
        {economicControlChain.stages.map((stage, idx) => {
          const isActive = !isLiveUnconnected && stage.active
          const isComplete = isActive && idx < chainStagesActive - 1 // simplistic demo completion
          return (
            <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 1 }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: '50%', 
                background: isLiveUnconnected ? 'var(--surface-2)' : isActive ? (isComplete ? 'var(--success-bg)' : 'var(--accent-glow)') : 'var(--surface-2)',
                border: `2px solid ${isLiveUnconnected ? 'var(--border-default)' : isActive ? (isComplete ? 'var(--success)' : 'var(--accent)') : 'var(--border-default)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isLiveUnconnected ? 'var(--text-muted)' : isActive ? (isComplete ? 'var(--success)' : 'var(--accent-bright)') : 'var(--text-muted)',
                fontWeight: 800, fontSize: 18,
                boxShadow: isActive && !isComplete ? '0 0 20px rgba(212,160,23,0.3)' : 'none'
              }}>
                {idx + 1}.
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stage.title}</span>
            </div>
          )
        })}
      </div>
    </ExecutiveSection>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <ExecutiveSection testId='executive-command-center-value-snapshot' title='Executive Value Snapshot'>
        <div style={{ background: 'var(--surface-0)', borderRadius: 16, border: '1px solid var(--border-default)', padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {waterfallData.map((d) => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 80, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{d.label}</div>
                <div style={{ flex: 1, background: 'var(--surface-2)', height: 24, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: isLiveUnconnected ? '0%' : `${Math.max((d.value / maxVal) * 100, 2)}%`, background: d.color, transition: 'width 1s ease-out' }} />
                </div>
                <div style={{ width: 100, textAlign: 'right', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtOrPending(d.value)}</div>
              </div>
            ))}
          </div>
        </div>
      </ExecutiveSection>

      <ExecutiveSection testId='executive-command-center-finance-snapshot' title='Outcome Finance Snapshot'>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Verified</div>
            <div style={{ marginTop: 12, color: 'var(--success)', fontSize: 28, fontWeight: 800 }}>{fmtFinance(outcomeFinance.metrics.verifiedValue)}</div>
          </div>
          <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Finance Verified</div>
            <div style={{ marginTop: 12, color: 'var(--success)', fontSize: 28, fontWeight: 800 }}>{fmtFinance(financeVerifiedValue)}</div>
          </div>
          <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Variance</div>
            <div style={{ marginTop: 12, color: 'var(--text-primary)', fontSize: 28, fontWeight: 800 }}>{fmtFinance(outcomeFinance.metrics.variance)}</div>
          </div>
        </div>
      </ExecutiveSection>

      <ExecutiveSection testId='executive-command-center-next-actions' title='Recommended Next Actions'>
        {nextActions.length === 0
          ? <EmptyState title='No next actions right now.' description='Recommended next actions will appear here as readiness data changes.' />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nextActions.map((action, index) => <Link key={`${action.label}-${index}`} href={action.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, border: '1px solid var(--border-gold)', background: 'var(--surface-0)', borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'background 0.2s' }} className="hover-elevate">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    {index + 1}.
                  </div>
                  <div style={{ flex: 1, color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>{action.label}</div>
                  <div style={{ color: 'var(--accent)', fontSize: 18 }}>→</div>
                </div>
              </Link>)}
            </div>}
      </ExecutiveSection>
    </div>

    <ExecutiveSection testId='executive-command-center-attention' title='What Requires Attention'>
      {attention.length === 0 || isLiveUnconnected
        ? <EmptyState
            title={isLiveUnconnected ? 'No Findings Yet' : 'Nothing requires attention right now.'}
            description={isLiveUnconnected
              ? 'Connect a supported platform to begin discovery. Risks and blockers will appear here once data is available.'
              : 'Executive Risk, Live Tenant Readiness and Tenant Readiness are currently clear of blockers.'}
          />
        : <div style={{ background: 'var(--surface-0)', borderRadius: 16, border: '1px solid var(--border-default)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid var(--border-default)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
              <span>Priority</span><span>Issue</span><span>Recommended Action</span>
            </div>
            {attention.map((item, index) => <div key={`${item.issue}-${index}`} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 16, alignItems: 'center', padding: '16px 24px', borderBottom: index < attention.length - 1 ? '1px solid var(--border-default)' : 'none', fontSize: 14, color: 'var(--text-primary)' }}>
              <StatusChip label={item.priority} tone={item.priority === 'HIGH' ? 'danger' : item.priority === 'MEDIUM' ? 'warning' : 'neutral'} />
              <span style={{ fontWeight: 500 }}>{item.issue}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
            </div>)}
          </div>}
    </ExecutiveSection>

  </main>
}

export default function CommandView(_props: { params?: { domain?: string } } = {}) {
  return <Shell><CommandViewBody /></Shell>
}
