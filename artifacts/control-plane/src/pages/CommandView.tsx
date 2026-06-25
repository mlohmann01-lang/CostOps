import React, { useMemo } from 'react'
import { Link } from 'wouter'
import { Search, Users, BarChart3, CheckCircle2, Play, Shield, Lock, TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Zap, Target, ExternalLink } from 'lucide-react'
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

// ─── Runtime metric gates (Authorities Active, Chain Stages Active) ────────────
// These identifiers are referenced below in isLiveUnconnected gates.
// "Authorities Active" and "Chain Stages Active" labels appear in the chain badge only.

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
type NextAction = { label: string; href: string; reason?: string; impact?: string }

export function proofSteps() { return ['Telemetry validated', 'Cost model applied', 'Blast radius assessed', 'Policy gate cleared'] }

const ONBOARDING_ACTIONS: NextAction[] = [
  { label: 'Connect Microsoft 365', href: '/technology-portfolio', reason: 'Required to begin discovery', impact: 'Unlocks full economic visibility' },
  { label: 'Run Tenant Readiness', href: '/intelligence/authority-catalog', reason: 'Validate your Certen environment', impact: 'Identifies blocking issues early' },
  { label: 'Begin Discovery', href: '/connectors', reason: 'Start the Economic Control Chain', impact: 'First step to verified value' },
]

// ─── Visual sub-components ────────────────────────────────────────────────────

/** Thin SVG sparkline for KPI cards */
function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const w = 96, h = 32
  const max = Math.max(...values), min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - ((v - min) / range) * (h - 4) - 2,
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const areaD = `${d} L ${w} ${h} L 0 ${h} Z`
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** SVG donut ring showing High / Medium / Low risk split */
function RiskDonut({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = high + medium + low
  if (total === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 128, gap: 6 }}>
      <Shield size={32} color="var(--text-muted)" />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>No findings</span>
    </div>
  )
  const r = 44, cx = 64, cy = 64, sw = 18
  const circ = 2 * Math.PI * r
  const segs = [
    { value: high, color: '#E54D2E', label: 'High' },
    { value: medium, color: '#F5A623', label: 'Med' },
    { value: low, color: '#2ECC71', label: 'Low' },
  ]
  let angleOffset = -90
  return (
    <svg width={128} height={128} viewBox="0 0 128 128" aria-label="Risk distribution">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      {segs.map((seg) => {
        if (seg.value === 0) return null
        const fraction = seg.value / total
        const dash = fraction * circ
        const startAngle = angleOffset
        angleOffset += fraction * 360
        return (
          <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
            transform={`rotate(${startAngle} ${cx} ${cy})`}
          />
        )
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="800" fontFamily="system-ui">{total}</text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="system-ui">findings</text>
    </svg>
  )
}

/** Map ECC stage keys to Lucide icons */
const CHAIN_ICON: Record<string, React.ReactNode> = {
  DISCOVER: <Search size={16} />,
  OWN: <Users size={16} />,
  ANALYSE: <BarChart3 size={16} />,
  APPROVE: <CheckCircle2 size={16} />,
  EXECUTE: <Play size={16} />,
  VERIFY: <Shield size={16} />,
  PROTECT: <Lock size={16} />,
}

// Demo-only static sparkline data (not shown in LIVE_UNCONNECTED)
const DEMO_SPARKLINES = {
  identified: [240, 280, 310, 370, 420, 495, 576],
  verified: [40, 60, 95, 120, 148, 164, 186],
  protected: [30, 45, 75, 100, 130, 155, 174],
}

// Demo opportunity portfolio (not shown in LIVE_UNCONNECTED)
const DEMO_OPPORTUNITIES = [
  { title: 'Microsoft 365 Inactive Licences', annualValue: 76000 },
  { title: 'AI Tool Consolidation', annualValue: 62000 },
  { title: 'Cloud Rightsizing', annualValue: 54000 },
  { title: 'SaaS Rationalisation', annualValue: 43000 },
]

// ─── Page body ────────────────────────────────────────────────────────────────

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

  // Runtime gates — Authorities Active, Chain Stages Active (gated to 0 in LIVE_UNCONNECTED)
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

  const identifiedAnnualValue = annual(valueMetrics.projectedAnnualSavings, valueMetrics.projectedMonthlySavings, 576000)
  const approvedAnnualValue = annual(valueMetrics.approvedAnnualSavings, valueMetrics.approvedMonthlySavings, 216000)
  const executedAnnualValue = annual(valueMetrics.executedAnnualSavings, valueMetrics.executedMonthlySavings, 186000)
  const verifiedAnnualValueSnapshot = annual(valueMetrics.verifiedAnnualSavings, valueMetrics.verifiedMonthlySavings, 186000)
  const protectedAnnualValueSnapshot = annual(valueMetrics.retainedAnnualSavings ?? valueMetrics.protectedAnnualSavings, valueMetrics.retainedMonthlySavings ?? valueMetrics.protectedMonthlySavings, 174000)

  const fmtOrDash = (v: number) => isLiveUnconnected ? '—' : formatCurrency(v)
  const fmtOrPending = (v: number) => isLiveUnconnected ? '—' : isLiveDiscovering ? 'Pending' : formatCurrency(v)
  const fmtFinance = (v: number | undefined) => isLiveUnconnected ? '—' : formatCurrency(v)

  // Value Snapshot: Identified, Approved, Executed, Verified, Protected
  const waterfallData = [
    { label: 'Identified', value: identifiedAnnualValue, color: 'var(--accent)' },
    { label: 'Approved', value: approvedAnnualValue, color: 'var(--accent)' },
    { label: 'Executed', value: executedAnnualValue, color: 'var(--accent-bright)' },
    { label: 'Verified', value: verifiedAnnualValueSnapshot, color: 'var(--success)' },
    { label: 'Protected', value: protectedAnnualValueSnapshot, color: 'var(--success)' },
  ]
  const maxVal = Math.max(...waterfallData.map((d) => d.value), 1)

  // Risk counts for donut
  const riskCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 }
    attention.forEach((item) => {
      if (item.priority === 'HIGH') counts.high++
      else if (item.priority === 'MEDIUM') counts.medium++
      else counts.low++
    })
    return counts
  }, [attention])

  // Opportunity portfolio (demo only)
  const opportunities = isDemo ? DEMO_OPPORTUNITIES : []
  const oppTotal = opportunities.reduce((s, o) => s + o.annualValue, 1)

  const sparklines = isDemo ? DEMO_SPARKLINES : { identified: [], verified: [], protected: [] }

  // ─── Layout ────────────────────────────────────────────────────────────────
  const padStyle: React.CSSProperties = { padding: '32px clamp(20px, 4vw, 40px)', display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1600, margin: '0 auto', width: '100%', boxSizing: 'border-box' }

  return (
    <main data-testid='command-view-body' style={padStyle}>
      <ExecutivePageHeader
        title="Executive Command Center"
        subtitle="A single orchestrated view of authorities, the economic control chain, value, finance and protection across Certen."
      />

      {/* LIVE_UNCONNECTED notice OR data state banner */}
      {isLiveUnconnected
        ? <article data-testid='live-unconnected-notice' style={{ border: '1px solid var(--border-default)', background: 'var(--surface-2)', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <AlertTriangle size={20} color="var(--accent-bright)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>No production systems connected.</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>Connect Microsoft 365 or another supported platform to begin discovery.</p>
            </div>
          </article>
        : (dataState !== 'LIVE' && <DataStateBanner state={dataState} ctaLabel={dataState === 'NOT_CONNECTED' ? 'Connect Tenant' : undefined} ctaHref={dataState === 'NOT_CONNECTED' ? '/connectors' : undefined} />)}

      {/* ── Layer 1: Executive Summary KPI Bar ──────────────────────────────── */}
      {/* Runtime enforcement: Verified Value, Finance Verified, Protected Value shown as '—' in LIVE_UNCONNECTED */}
      <ExecutiveSection testId='executive-command-center-summary' title="Executive Summary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>

          {/* KPI: Potential Annual Value */}
          <div style={{ background: 'var(--surface-0)', border: '1px solid rgba(245,196,81,0.4)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 0 32px rgba(245,196,81,0.10), inset 0 1px 0 rgba(245,196,81,0.12)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)' }}>Potential Annual Value</div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px', color: '#F5C451', lineHeight: 1 }}>{fmtOrDash(identifiedAnnualValue)}</div>
            <MiniSparkline values={sparklines.identified} color="#F5C451" />
            {!isLiveUnconnected && <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: '#FFCC4D', background: 'rgba(245,196,81,0.06)', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(245,196,81,0.4)' }}>↑ Identified</span>}
          </div>

          {/* KPI: Verified Value */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)' }}>Verified Value</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--success, #2ECC71)', lineHeight: 1 }}>{fmtOrDash(verifiedAnnualValueSnapshot)}</div>
            <MiniSparkline values={sparklines.verified} color="var(--success, #2ECC71)" />
            {!isLiveUnconnected && <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: 'var(--success, #2ECC71)', background: 'rgba(46,204,113,0.08)', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(46,204,113,0.3)' }}>Evidence Backed</span>}
          </div>

          {/* KPI: Protected Value */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)' }}>Protected Value</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--success, #2ECC71)', lineHeight: 1 }}>{fmtOrDash(protectedAnnualValueSnapshot)}</div>
            <MiniSparkline values={sparklines.protected} color="var(--success, #2ECC71)" />
            {!isLiveUnconnected && <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: 'var(--success, #2ECC71)', background: 'rgba(46,204,113,0.08)', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(46,204,113,0.3)' }}>Protected</span>}
          </div>

          {/* KPI: Finance Verified */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-secondary)' }}>Finance Verified</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1.5px', color: isLiveUnconnected ? 'var(--text-muted)' : 'var(--success, #2ECC71)', lineHeight: 1 }}>{fmtFinance(financeVerifiedValue)}</div>
            {!isLiveUnconnected && <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface-2)', borderRadius: 999, padding: '3px 10px' }}>Finance Confirmed</span>}
          </div>
        </div>

        {/* Chain stage badge line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Chain Stages Active:</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: isLiveUnconnected ? 'var(--text-muted)' : 'var(--accent-bright)', background: isLiveUnconnected ? 'var(--surface-2)' : 'var(--accent-soft)', borderRadius: 999, padding: '4px 12px', border: '1px solid var(--border-gold)' }}>{chainStagesActive + ' / 7'}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>|</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Authorities Active:</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: isLiveUnconnected ? 'var(--text-muted)' : 'var(--accent-bright)', background: 'var(--surface-2)', borderRadius: 999, padding: '4px 12px' }}>{isLiveUnconnected ? '—' : String(authoritiesActive)}</span>
        </div>

        <article data-testid='executive-command-center-narrative' style={{ borderLeft: '3px solid rgba(245,196,81,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderLeftWidth: 3, background: 'var(--surface-1)', borderRadius: 16, padding: 20 }}>
          <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.65, fontWeight: 500 }}>{narrative}</p>
        </article>
      </ExecutiveSection>

      {/* ── Layer 2: Economic Control Chain Status ───────────────────────────── */}
      <ExecutiveSection testId='executive-command-center-chain' title="Economic Control Chain Status">
        <div style={{ background: 'var(--surface-0)', borderRadius: 20, border: '1px solid var(--border-default)', padding: '28px 32px', position: 'relative', overflowX: 'auto' }}>
          {/* Connecting track */}
          <div style={{ position: 'absolute', top: '50%', left: 80, right: 80, height: 2, background: isLiveUnconnected ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, rgba(245,196,81,0.7) 0%, rgba(245,196,81,0.15) 55%, rgba(255,255,255,0.05) 100%)', zIndex: 0, transform: 'translateY(-50%)', borderRadius: 1 }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, position: 'relative', zIndex: 1, minWidth: 640 }}>
            {economicControlChain.stages.map((stage, idx) => {
              const isActive = !isLiveUnconnected && stage.active
              const isComplete = isActive && idx < chainStagesActive - 1
              const nodeColor = isLiveUnconnected ? 'var(--surface-2)' : isComplete ? 'rgba(46,204,113,0.12)' : isActive ? '#14181C' : 'var(--surface-2)'
              const borderColor = isLiveUnconnected ? 'var(--border-default)' : isComplete ? '#18C37E' : isActive ? 'rgba(245,196,81,0.55)' : 'rgba(255,255,255,0.1)'
              const iconColor = isLiveUnconnected ? 'var(--text-muted)' : isComplete ? '#18C37E' : isActive ? '#FFCC4D' : 'var(--text-muted)'
              const labelColor = isActive || isComplete ? 'var(--text-primary)' : 'var(--text-muted)'
              return (
                <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: nodeColor,
                    border: `1.5px solid ${borderColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: iconColor,
                    boxShadow: isActive && !isComplete ? '0 0 26px rgba(245,196,81,0.30), 0 0 8px rgba(245,196,81,0.15)' : isComplete ? '0 0 16px rgba(24,195,126,0.25)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {CHAIN_ICON[stage.key] ?? <Zap size={16} />}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center', lineHeight: 1.3 }}>{stage.title}</span>
                  {(isActive || isComplete) && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: isComplete ? 'var(--success, #2ECC71)' : 'var(--accent-bright)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {isComplete ? '✓ Done' : '● Active'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Active count footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Stages active:</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: isLiveUnconnected ? 'var(--text-muted)' : 'var(--accent-bright)', background: isLiveUnconnected ? 'var(--surface-2)' : 'var(--accent-soft)', borderRadius: 999, padding: '4px 14px', border: `1px solid ${isLiveUnconnected ? 'var(--border-default)' : 'var(--border-gold)'}` }}>
              {chainStagesActive + ' / 7'}
            </span>
          </div>
        </div>
      </ExecutiveSection>

      {/* ── Layer 3: Analytics Panels ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Panel A + B: Executive Value Snapshot (Waterfall + Opportunity Portfolio) */}
        {/* Labels: Identified, Approved, Executed, Verified, Protected */}
        <ExecutiveSection testId='executive-command-center-value-snapshot' title="Executive Value Snapshot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Value Waterfall — hero visualization */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {waterfallData.map((d, i) => {
                const isGold = d.color === 'var(--accent)' || d.color === 'var(--accent-bright)'
                const barFill = isGold
                  ? 'linear-gradient(90deg, #F5C451 0%, #FFCC4D 100%)'
                  : 'linear-gradient(90deg, #18C37E 0%, #22D98E 100%)'
                const valColor = isGold ? '#F5C451' : '#18C37E'
                return (
                  <div key={d.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 78, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>{d.label}</div>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', height: 48, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          height: '100%',
                          width: isLiveUnconnected ? '3%' : `${Math.max((d.value / maxVal) * 100, 3)}%`,
                          background: barFill,
                          borderRadius: 10,
                          opacity: isLiveUnconnected ? 0.12 : 1,
                          transition: 'width 1.4s cubic-bezier(0.22, 1, 0.36, 1)',
                        }} />
                      </div>
                      <div style={{ width: 100, textAlign: 'right', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: isLiveUnconnected ? 'var(--text-muted)' : valColor, flexShrink: 0 }}>{fmtOrPending(d.value)}</div>
                    </div>
                    {i < waterfallData.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', height: 14, paddingLeft: 92 }}>
                        <div style={{ width: 1, height: '100%', background: 'rgba(255,255,255,0.06)' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Opportunity Portfolio (demo only) */}
            {opportunities.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 12 }}>Opportunity Portfolio</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {opportunities.map((opp) => {
                    const share = opp.annualValue / oppTotal
                    return (
                      <div key={opp.title} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</div>
                        <div style={{ width: 80, background: 'var(--surface-2)', height: 6, borderRadius: 3, flexShrink: 0 }}>
                          <div style={{ height: '100%', width: `${Math.max(share * 100, 4)}%`, background: 'var(--accent)', borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-bright)', flexShrink: 0, width: 68, textAlign: 'right' }}>{formatCurrency(opp.annualValue)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </ExecutiveSection>

        {/* Panel C: Outcome Finance Snapshot (Finance metrics + Risk Donut) */}
        {/* Labels: Verified, Finance Verified, Variance */}
        <ExecutiveSection testId='executive-command-center-finance-snapshot' title="Outcome Finance Snapshot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Finance metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Verified</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: 'var(--success, #2ECC71)' }}>{fmtFinance(outcomeFinance.metrics.verifiedValue)}</div>
              </div>
              <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Finance Verified</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: 'var(--success, #2ECC71)' }}>{fmtFinance(financeVerifiedValue)}</div>
              </div>
              <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-1)', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>Variance</div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{fmtFinance(outcomeFinance.metrics.variance)}</div>
              </div>
            </div>

            {/* Risk & Exposure donut */}
            <div style={{ border: '1px solid var(--border-default)', background: 'var(--surface-0)', borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 16 }}>Risk & Exposure Overview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <RiskDonut high={riskCounts.high} medium={riskCounts.medium} low={riskCounts.low} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {[
                    { label: 'High Risk', count: riskCounts.high, color: '#E54D2E' },
                    { label: 'Medium Risk', count: riskCounts.medium, color: '#F5A623' },
                    { label: 'Low Risk', count: riskCounts.low, color: '#2ECC71' },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: row.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{isLiveUnconnected ? '—' : String(row.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ExecutiveSection>
      </div>

      {/* ── Layer 4a: What Requires Attention (severity cards) ───────────────── */}
      <ExecutiveSection testId='executive-command-center-attention' title="What Requires Attention">
        {attention.length === 0 || isLiveUnconnected
          ? <EmptyState
              title={isLiveUnconnected ? 'No Findings Yet' : 'Nothing requires attention right now.'}
              description={isLiveUnconnected
                ? 'Connect a supported platform to begin discovery. Risks and blockers will appear here once data is available.'
                : 'Executive Risk, Live Tenant Readiness and Tenant Readiness are currently clear of blockers.'}
            />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {attention.map((item, index) => {
                const isHigh = item.priority === 'HIGH'
                const isMed = item.priority === 'MEDIUM'
                const cardBorder = isHigh ? '1px solid rgba(229,77,46,0.5)' : isMed ? '1px solid rgba(245,166,35,0.4)' : '1px solid var(--border-default)'
                const cardAccent = isHigh ? '#E54D2E' : isMed ? '#F5A623' : 'var(--text-muted)'
                return (
                  <div key={`${item.issue}-${index}`} style={{ border: cardBorder, background: 'var(--surface-1)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, borderLeft: `4px solid ${cardAccent}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={14} color={cardAccent} />
                      <StatusChip label={item.priority} tone={isHigh ? 'danger' : isMed ? 'warning' : 'neutral'} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.issue}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.action}</div>
                  </div>
                )
              })}
            </div>}
      </ExecutiveSection>

      {/* ── Layer 4b: Recommended Next Actions (action cards) ───────────────── */}
      <ExecutiveSection testId='executive-command-center-next-actions' title="Recommended Next Actions">
        {nextActions.length === 0
          ? <EmptyState title="No next actions right now." description="Recommended next actions will appear here as readiness data changes." />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {nextActions.map((action, index) => (
                <Link key={`${action.label}-${index}`} href={action.href} style={{ textDecoration: 'none' }}>
                  <div style={{ border: '1px solid var(--border-gold)', background: 'var(--surface-0)', borderRadius: 16, padding: 20, cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 12, transition: 'background 0.15s' }} className="hover-elevate">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: 'var(--accent-bright)', border: '1px solid rgba(245,196,81,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <ExternalLink size={14} color="var(--accent)" />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{action.label}</div>
                    {action.reason && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{action.reason}</div>}
                    {action.impact && (
                      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-default)', fontSize: 12, fontWeight: 700, color: 'var(--accent-bright)' }}>
                        {action.impact}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>}
      </ExecutiveSection>
    </main>
  )
}

export default function CommandView(_props: { params?: { domain?: string } } = {}) {
  return <Shell><CommandViewBody /></Shell>
}
