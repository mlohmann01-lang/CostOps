import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'wouter'
import { Shell } from '../components/layout/Shell'
import { DomainTabs } from '../components/layout/DomainTabs'
import { CommandBar } from '../components/layout/CommandBar'
import { buildActionProofDetail, loadCommandViewState, type ActionProofDetail, type CommandActionState, type ConnectorHealth, type ProofGateStatus } from '../lib/commandViewData'
import { useRuntimeContext } from '../lib/runtimeContext'
import { RuntimeEnvironmentBanner } from '../components/RuntimeEnvironmentBanner'
import type { Domain } from '../types/connector'

interface CommandViewProps { params?: { domain?: string } }
const toConnectorTabs = (rows: Array<{ id: string; name: string; health: ConnectorHealth }>) => rows.map((c) => ({ id: c.id, name: c.name, domain: 'all' as Domain, description: c.name, iconType: 'saas' as const, readiness: c.health === 'HEALTHY' ? 'READY' as const : c.health === 'DEGRADED' ? 'DEGRADED' as const : 'UNAVAILABLE' as const, enabled: true, lastSyncAt: null, evidenceSources: [] }))
const rank: Record<string, number> = { BLOCKED: 1, APPROVAL_REQUIRED: 2, READY_TO_EXECUTE: 3, DRIFTED: 4, IN_PROGRESS: 5, VERIFIED: 6, INVESTIGATE: 7 }

const StatusBadge = ({ value }: { value: string }) => <span style={{ fontSize: 10, border: '0.5px solid var(--border-subtle)', borderRadius: 999, padding: '2px 8px' }}>{value}</span>
const MetricTile = ({ k, v }: { k: string; v: string | number }) => <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 8, padding: 8 }}><div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{k}</div><div>{v}</div></div>
const ProofGateRow = ({ label, status, detail }: { label: string; status: ProofGateStatus; detail: string }) => <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid var(--border-subtle)', padding: '6px 0' }}><span>{label}</span><span>{status}</span><span style={{ color: 'var(--text-secondary)' }}>{detail}</span></div>
const EvidenceSourceCard = ({ s }: { s: ActionProofDetail['evidence']['sources'][number] }) => <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 8, padding: 8 }}><div><strong>{s.name}</strong> <StatusBadge value={s.status} /></div><div style={{ fontSize: 11 }}>{s.detail ?? 'Not available'}</div><div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.lastSeenAt ?? 'Not available'}</div></div>
const LifecycleTimeline = ({ rows }: { rows: ActionProofDetail['lifecycle'] }) => <div>{rows.map((r) => <div key={r.stage} style={{ borderLeft: '2px solid var(--border-subtle)', marginLeft: 4, paddingLeft: 10, paddingBottom: 8 }}><div><strong>{r.stage}</strong> · {r.status}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.detail ?? 'Not available'} {r.timestamp ?? ''}</div></div>)}</div>

export default function CommandView({ params }: CommandViewProps) {
  const domain = (params?.domain ?? 'all') as Domain
  const [, navigate] = useLocation()
  const runtime = useRuntimeContext()
  const { data, isLoading, error } = useQuery({ queryKey: ['command-view-runtime', runtime.environment], queryFn: () => loadCommandViewState({ environment: runtime.environment ?? 'DEMO', tenantId: runtime.tenantId, tenantMode: runtime.tenantMode, executionCapabilities: runtime.executionCapabilities, connectorPolicy: runtime.connectorPolicy }) })
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  // All hooks must be called unconditionally before any early return
  const filteredActions = useMemo(() => {
    if (!data) return []
    return [...(domain === 'all' ? data.actionQueue : data.actionQueue.filter((a) => a.domain === domain))].sort((a, b) => (rank[a.state] ?? 99) - (rank[b.state] ?? 99))
  }, [domain, data])
  const state = data
  if (!state) return <Shell><div style={{ padding: 20 }}>Loading runtime control-plane data…</div><CommandBar /></Shell>
  const selected = filteredActions.find((a) => a.id === selectedActionId) ?? filteredActions[0]
  const proof = selected ? buildActionProofDetail(selected, state) : null

  const actionButton = (s: CommandActionState) => {
    if (!proof) return null
    if (s === 'READY_TO_EXECUTE' && runtime.isDemo) return <button disabled title='Demo simulation only. No production systems connected.'>Simulate governed execution</button>
    if (s === 'READY_TO_EXECUTE' && runtime.isLive && runtime.executionCapabilities.liveExecutionEnabled) return <button disabled title='Execution mutation not enabled in this sprint'>Start governed execution</button>
    if (s === 'READY_TO_EXECUTE' && runtime.isLive && runtime.executionCapabilities.dryRunEnabled) return <button disabled title='Dry-run endpoint not enabled in this sprint'>Run dry-run validation</button>
    if (s === 'READY_TO_EXECUTE' && runtime.isLive) return <button disabled>Governed execution disabled in this beta workspace.</button>
    if (s === 'APPROVAL_REQUIRED') return <button onClick={() => navigate('/all/governance')}>Review approval requirements</button>
    if (s === 'BLOCKED') return <button disabled>View blocking evidence</button>
    if (s === 'DRIFTED') return <button disabled>Review drift recurrence</button>
    return <button onClick={() => navigate('/all/execution')}>View execution record</button>
  }

  return <Shell><div style={{ padding: '16px 20px 0', borderBottom: '0.5px solid var(--border-subtle)', background: 'var(--surface-0)', flexShrink: 0 }}><h1 style={{ fontSize: 15, fontWeight: 500, marginBottom: 10 }}>Command</h1><DomainTabs connectors={toConnectorTabs(state.connectors)} currentDomain={domain} basePath='/:domain/command' /></div>
    <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'grid', gap: 12 }}>
      <RuntimeEnvironmentBanner />
      {(runtime.isDemo) && <div style={{ border: '1px solid var(--c-amber-300)', background: 'var(--c-amber-50)', padding: 10, borderRadius: 8, fontSize: 12 }}>Synthetic evidence only. No production systems connected. Live execution disabled. Safe execution simulation only.</div>}
      {(runtime.isLive) && <div style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-2)', padding: 10, borderRadius: 8, fontSize: 12 }}>Connected to real enterprise systems. Governed actions are subject to trust, approval, connector health, and policy controls.</div>}
      <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 10, padding: 12 }}><strong>{state.globalVerdict}</strong><div style={{ fontSize: 12 }}>{state.verdictReason}</div><div style={{ marginTop: 6, fontSize: 12 }}><strong>Next action:</strong> {state.verdictNextAction}</div></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 12 }}>{Object.entries({ 'Monthly Savings Identified': state.summary.monthlySavingsIdentified, 'Governed Eligible Savings': state.summary.governedEligibleSavings, 'Pending Approval Value': state.summary.pendingApprovalValue, 'Verified Realized Savings': state.summary.verifiedRealizedSavings, 'Blocked Value': state.summary.blockedValue, 'Drift Exposure': state.summary.driftExposure, 'Connector Health': state.summary.connectorHealthScore ?? 0, 'Data Trust Health': state.summary.dataTrustHealth ?? 0 }).map(([k, v]) => <MetricTile key={k} k={k} v={typeof v === 'number' ? v.toLocaleString() : v} />)}</div>
      <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 10 }}><div style={{ padding: 10, fontSize: 11 }}>Governed Action Queue</div>{filteredActions.map((a) => <button key={a.id} onClick={() => setSelectedActionId(a.id)} style={{ width: '100%', textAlign: 'left', background: selected?.id === a.id ? 'var(--surface-2)' : 'transparent', border: 'none', borderTop: '0.5px solid var(--border-subtle)', padding: 10, fontSize: 12 }}><div><strong>{a.title}</strong> · {a.domain} · <StatusBadge value={a.state} /></div><div>Trust {a.trustScore ?? 'n/a'} · Risk {a.riskClass ?? 'n/a'} · Approval {a.approvalState ?? 'n/a'} · Mode {a.executionMode ?? 'n/a'} · Savings {(a.projectedMonthlySavings ?? 0).toLocaleString()}/mo</div><div>Next: {a.nextStep}</div></button>)}</div>
      {proof && <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
        <div><strong>{proof.title}</strong> <StatusBadge value={proof.domain} /> <StatusBadge value={proof.currentState} /> <StatusBadge value={proof.verdict} /><div>Next step: {proof.nextStep}</div></div>
        <div><h3>Why this verdict?</h3><div>{proof.verdictReason}</div><div>Trust {proof.governance.trustScore ?? 'Not available'} · Risk {proof.governance.riskClass ?? 'Not available'} · Approval {proof.governance.approvalState ?? 'Not available'} · Execution mode {proof.execution.mode}</div></div>
        <div><h3>Evidence reviewed</h3><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>{proof.evidence.sources.map((s) => <EvidenceSourceCard key={s.id} s={s} />)}</div></div>
        <div><h3>Governance gates</h3>{proof.governance.trustDrivers.map((d) => <ProofGateRow key={d.label} label={d.label} status={d.status} detail={d.detail} />)}</div>
        <div><h3>Execution readiness</h3><div>Mode: {proof.execution.mode} · Dry-run: {proof.execution.dryRunAvailable ? 'Yes' : 'No'} · Live execution enabled: {proof.execution.liveExecutionEnabled ? 'Yes' : 'No'}</div><div>{proof.execution.readinessStatus} · {proof.execution.readinessReason}</div><div>Rollback: {proof.rollback.status} · {proof.rollback.detail}</div>{state.dataMode.tenantMode === 'DEMO' && <div>Live execution disabled in demo workspace.</div>}{actionButton(proof.currentState)}</div>
        <div><h3>Lifecycle timeline</h3><LifecycleTimeline rows={proof.lifecycle} /></div>
        <div><h3>Outcome and drift</h3><div>Projected monthly {proof.outcome.projectedMonthlySavings?.toLocaleString() ?? 'Not available'} · projected annual {proof.outcome.projectedAnnualSavings?.toLocaleString() ?? 'Not available'} · verified {proof.outcome.verifiedMonthlySavings?.toLocaleString() ?? 'Not yet verified'}</div><div>Savings confidence {proof.outcome.savingsConfidence ?? 'Not available'} · verification {proof.outcome.verificationState ?? 'Not yet verified'} · drift risk {proof.outcome.driftRisk ?? 'Not available'}</div></div>
      </div>}
      <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Connector Integrity</div>{state.connectors.map((c) => <div key={c.id} style={{ fontSize: 12 }}>{c.name}: {c.health} · {c.mode} · {c.capability} · {c.freshness ?? 'Not available'}</div>)}</div>
      <div style={{ border: '0.5px solid var(--border-subtle)', borderRadius: 10, padding: 10 }}><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Drift Monitoring</div>{state.driftSignals.length ? state.driftSignals.map((d) => <div key={d.id} style={{ fontSize: 12 }}>{d.title} · {d.severity} · {d.status} · at risk {(d.valueAtRisk ?? 0).toLocaleString()}</div>) : <div style={{ fontSize: 12 }}>No active drift detected in this workspace.</div>}</div>
      {isLoading && <div style={{ fontSize: 12 }}>Loading runtime control-plane data…</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--c-amber-600)' }}>Runtime API error. Showing deterministic demo state.</div>}
      {state?.dataSource === 'DEMO_SEED' && <div style={{ fontSize: 12, color: 'var(--c-amber-600)' }}>Deterministic demo runtime active.</div>}
      {state?.dataSource === 'LIVE_ERROR' && <div style={{ fontSize: 12, color: 'var(--c-amber-600)' }}>Live API error. Showing honest live empty state.</div>}
    </div><CommandBar /></Shell>
}
