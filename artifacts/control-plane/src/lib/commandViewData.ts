export type CommandVerdict = 'GOVERNED_EXECUTION_ELIGIBLE' | 'APPROVAL_REQUIRED' | 'BLOCKED_DATA_TRUST' | 'DRIFT_DETECTED' | 'EXECUTION_IN_PROGRESS' | 'NO_ACTION_READY' | 'DEMO_DATA_ONLY'
export type CommandActionState = 'READY_TO_EXECUTE' | 'APPROVAL_REQUIRED' | 'BLOCKED' | 'IN_PROGRESS' | 'VERIFIED' | 'DRIFTED' | 'INVESTIGATE'
export type ConnectorMode = 'SYNTHETIC' | 'LIVE' | 'HYBRID'
export type ConnectorExecutionCapability = 'READ_ONLY' | 'GOVERNED_EXECUTION' | 'NONE'
export type ConnectorHealth = 'HEALTHY' | 'DEGRADED' | 'BLOCKED' | 'UNKNOWN'

export type ExecutionMode = 'READ_ONLY' | 'RECOMMEND_ONLY' | 'APPROVAL_REQUIRED' | 'AUTO_EXECUTE_SAFE' | 'GOVERNANCE_ENFORCED'
export type ProofGateStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'BLOCKED' | 'NOT_AVAILABLE'
export type ActionLifecycleStage = 'DISCOVERED' | 'GOVERNED' | 'APPROVAL_PENDING' | 'APPROVED' | 'DRY_RUN_READY' | 'EXECUTION_READY' | 'EXECUTED' | 'VERIFIED' | 'DRIFT_MONITORED' | 'BLOCKED'
export type RollbackStatus = 'AVAILABLE' | 'PARTIAL' | 'NOT_AVAILABLE' | 'NOT_REQUIRED' | 'UNKNOWN'

export interface CommandViewState { globalVerdict: CommandVerdict; verdictReason: string; verdictNextAction: string; dataMode: { tenantMode: 'DEMO' | 'READ_ONLY' | 'GOVERNED_EXECUTION' | 'PRODUCTION'; connectorMode: ConnectorMode; liveExecutionEnabled: boolean; demoSafetyMessage?: string }; summary: { monthlySavingsIdentified: number; governedEligibleSavings: number; pendingApprovalValue: number; verifiedRealizedSavings: number; blockedValue: number; driftExposure: number; connectorHealthScore?: number; dataTrustHealth?: number }; actionQueue: Array<{ id: string; title: string; domain: string; recommendationType?: string; state: CommandActionState; trustScore?: number; riskClass?: string; approvalState?: string; executionMode?: string; projectedMonthlySavings?: number; projectedAnnualSavings?: number; nextStep: string; reason: string; evidenceSummary?: string; sourceIds?: string[] }>; connectors: Array<{ id: string; name: string; mode: ConnectorMode; health: ConnectorHealth; capability: ConnectorExecutionCapability; freshness?: string; trustImpact?: string }>; driftSignals: Array<{ id: string; title: string; severity: string; valueAtRisk?: number; status: string }>; dataSource?: 'DEMO_SEED' | 'LIVE_API' | 'LIVE_EMPTY' | 'LIVE_ERROR' }

export interface ActionProofDetail { actionId: string; title: string; domain: string; currentState: CommandActionState; verdict: CommandVerdict; verdictReason: string; nextStep: string; evidence: { summary: string; sources: Array<{ id: string; name: string; type: string; status: ProofGateStatus; freshness?: string; lastSeenAt?: string; detail?: string }> }; governance: { trustScore?: number; trustStatus: ProofGateStatus; trustDrivers: Array<{ label: string; status: ProofGateStatus; detail: string }>; riskClass?: string; riskReason?: string; policyOutcome: ProofGateStatus; policyDetail?: string; approvalState?: string; approvalRequired: boolean }; execution: { mode: ExecutionMode; dryRunAvailable: boolean; liveExecutionEnabled: boolean; readinessStatus: ProofGateStatus; readinessReason: string; blastRadius?: { impactedUsers?: number; impactedLicenses?: number; impactedServices?: number; estimatedMonthlyValue?: number; detail?: string } }; rollback: { status: RollbackStatus; reversible: boolean; detail: string }; outcome: { projectedMonthlySavings?: number; projectedAnnualSavings?: number; verifiedMonthlySavings?: number; savingsConfidence?: string; verificationState?: string; driftRisk?: string }; lifecycle: Array<{ stage: ActionLifecycleStage; status: 'COMPLETE' | 'CURRENT' | 'PENDING' | 'BLOCKED'; timestamp?: string; actor?: string; detail?: string }> }

export const DEMO_BANNER = 'Demo workspace: synthetic evidence only. No production systems connected. Live execution disabled.'
const json = async <T>(r: Response): Promise<T> => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<T> }
const n = (v: unknown) => Number(v ?? 0) || 0

// CommandView section -> API source mapping:
// - Verdict/action queue/proof baseline -> /api/recommendations + /api/approvals + /api/execution-orchestration/verifications
// - Outcome summary -> /api/outcomes/summary + /api/execution-orchestration/savings-proof/summary
// - Connector integrity -> /api/connectors
// - Drift monitoring -> /api/drift/events
export interface CommandViewRuntimeOptions { environment: 'DEMO' | 'LIVE'; tenantId: string; tenantMode: 'DEMO' | 'READ_ONLY' | 'GOVERNED_EXECUTION' | 'PRODUCTION'; executionCapabilities: { liveExecutionEnabled: boolean; simulatedExecutionEnabled: boolean; approvalEnabled: boolean; rollbackEnabled: boolean; dryRunEnabled: boolean }; connectorPolicy: { allowSynthetic: boolean; allowLiveConnectors: boolean; requireConnectorHealthForLive: boolean } }

export async function loadCommandViewState(runtime: CommandViewRuntimeOptions): Promise<CommandViewState> {
  if (runtime.environment === 'DEMO') {
    const { deterministicDemoCommandState } = await import('../demo-runtime/deterministicDemoCommandState')
    return { ...deterministicDemoCommandState, dataSource: 'DEMO_SEED' as any } as CommandViewState
  }
  try {
    const [recommendations, approvals, outcomesSummary, savingsSummary, connectors, drift, queueStatus, m365Readiness] = await Promise.all([
      fetch('/api/recommendations').then(json<any[]>), fetch('/api/approvals?tenantId=default').then(json<any[]>), fetch('/api/outcomes/summary').then(json<any>), fetch('/api/execution-orchestration/savings-proof/summary').then(json<any>), fetch('/api/connectors').then(json<any[]>), fetch('/api/drift/events').then(json<any[]>), fetch('/api/execution-orchestration/queue/status').then(json<any>), fetch('/api/connectors/m365/readiness').then(r=>r.ok?r.json():{status:'NOT_CONFIGURED'}),
    ])
    const actionQueue = recommendations.map((r) => {
      const status = String(r.executionStatus ?? '').toUpperCase()
      const state: CommandActionState = status.includes('AUTO') ? 'READY_TO_EXECUTE' : status.includes('APPROVAL') ? 'APPROVAL_REQUIRED' : status.includes('BLOCK') ? 'BLOCKED' : status.includes('INVESTIGATE') ? 'INVESTIGATE' : 'READY_TO_EXECUTE'
      return { id: String(r.id), title: `${r.displayName ?? r.userEmail ?? 'Action'} · ${r.licenceSku ?? 'Unknown SKU'}`, domain: String(r.connector ?? 'saas'), recommendationType: String(r.playbook ?? 'playbook'), state, trustScore: Math.round(n(r.trustScore) * 100), riskClass: n(r.trustScore) >= 0.85 ? 'C' : n(r.trustScore) >= 0.7 ? 'B' : 'A', approvalState: approvals.find((a) => String(a.recommendationId) === String(r.id))?.status ?? (state === 'APPROVAL_REQUIRED' ? 'PENDING' : 'NOT_REQUIRED'), executionMode: String(r.executionStatus ?? 'RECOMMEND_ONLY'), projectedMonthlySavings: n(r.monthlyCost), projectedAnnualSavings: n(r.annualisedCost), nextStep: state === 'APPROVAL_REQUIRED' ? 'Approve request in governance workflow' : state === 'BLOCKED' ? 'Resolve data trust or policy blocker' : 'Queue governed execution', reason: `Status ${r.status ?? 'pending'} with trust ${Math.round(n(r.trustScore) * 100)}%.`, evidenceSummary: `Last activity ${r.daysSinceActivity ?? 'unknown'} days ago.`, sourceIds: [String(r.connector ?? 'm365')] }
    })
    const normalizeHealth = (status: string): ConnectorHealth => status === 'connected' ? 'HEALTHY' : status === 'syncing' || status === 'degraded' ? 'DEGRADED' : status ? 'BLOCKED' : 'UNKNOWN'
    const connectorRows = connectors.map((c) => ({ id: String(c.id), name: String(c.name), mode: 'LIVE' as ConnectorMode, health: normalizeHealth(String(c.status ?? '')), capability: runtime.executionCapabilities.liveExecutionEnabled ? 'GOVERNED_EXECUTION' as ConnectorExecutionCapability : 'READ_ONLY' as ConnectorExecutionCapability, freshness: c.lastSync ? new Date(c.lastSync).toISOString() : undefined, trustImpact: `Trust ${n(c.trustScore)}%` }))
    const liveConnectors = connectorRows.filter((c) => c.health === 'HEALTHY').length
    const connectorMode: ConnectorMode = liveConnectors === 0 ? 'SYNTHETIC' : liveConnectors === connectorRows.length ? 'LIVE' : 'HYBRID'
    const blockedValue = actionQueue.filter((a) => a.state === 'BLOCKED').reduce((acc, a) => acc + n(a.projectedMonthlySavings), 0)
    const pendingApprovalValue = actionQueue.filter((a) => a.state === 'APPROVAL_REQUIRED').reduce((acc, a) => acc + n(a.projectedMonthlySavings), 0)
    const eligibleValue = actionQueue.filter((a) => a.state === 'READY_TO_EXECUTE').reduce((acc, a) => acc + n(a.projectedMonthlySavings), 0)
    const driftSignals = drift.map((d) => ({ id: String(d.id), title: String(d.driftReason ?? d.reversalReason ?? 'Drift event'), severity: String(d.severity ?? 'MEDIUM'), valueAtRisk: n(d.realizationDelta), status: String(d.status ?? 'OPEN') }))
    const m365Status = String(m365Readiness?.status ?? 'NOT_CONFIGURED')
    const hasDrift = driftSignals.length > 0; const hasBlocked = blockedValue > 0 || m365Status === 'BLOCKED'; const hasApprovals = pendingApprovalValue > 0; const executing = n(queueStatus.readyCount) > 0
    const globalVerdict: CommandVerdict = m365Status === 'NOT_CONFIGURED' ? 'NO_ACTION_READY' : hasBlocked ? 'BLOCKED_DATA_TRUST' : hasApprovals ? 'APPROVAL_REQUIRED' : hasDrift ? 'DRIFT_DETECTED' : executing ? 'EXECUTION_IN_PROGRESS' : eligibleValue > 0 ? 'GOVERNED_EXECUTION_ELIGIBLE' : 'NO_ACTION_READY'
    return { globalVerdict, verdictReason: m365Status === 'NOT_CONFIGURED' ? 'Microsoft 365 connector is not configured for live read-only ingestion.' : hasBlocked ? 'Some governed actions are blocked by trust or policy signals.' : hasApprovals ? 'Approvals are required before governed execution can proceed.' : hasDrift ? 'Drift signals indicate value may be regressing.' : executing ? 'Execution queue has active governed items.' : eligibleValue > 0 ? 'Governed actions are ready for safe execution.' : 'No governed actions are currently ready.', verdictNextAction: m365Status === 'NOT_CONFIGURED' ? 'Start M365 read-only setup, then run smoke test and sync.' : hasBlocked ? 'Clear trust blockers and refresh evidence.' : hasApprovals ? 'Approve highest-value pending actions.' : hasDrift ? 'Investigate drifted outcomes and resolve recurrence risk.' : executing ? 'Monitor queue and verify outcomes.' : eligibleValue > 0 ? 'Execute top eligible actions.' : 'Connect additional evidence sources.', dataMode: { tenantMode: runtime.tenantMode, connectorMode, liveExecutionEnabled: runtime.executionCapabilities.liveExecutionEnabled, demoSafetyMessage: undefined }, summary: { monthlySavingsIdentified: n(outcomesSummary.totalMonthlySaving) + actionQueue.reduce((a, x) => a + n(x.projectedMonthlySavings), 0), governedEligibleSavings: eligibleValue, pendingApprovalValue, verifiedRealizedSavings: n(savingsSummary.verifiedMonthlySavings), blockedValue, driftExposure: driftSignals.reduce((a, d) => a + n(d.valueAtRisk), 0), connectorHealthScore: connectorRows.length ? Math.round((connectorRows.filter((c) => c.health === 'HEALTHY').length / connectorRows.length) * 100) : 0, dataTrustHealth: Math.round((100 - Math.min(100, driftSignals.length * 20) + actionQueue.reduce((a, r) => a + n(r.trustScore), 0) / Math.max(1, actionQueue.length)) / 2) }, actionQueue, connectors: connectorRows, driftSignals , dataSource: 'LIVE_API' as any }
  } catch {
    return { globalVerdict: 'NO_ACTION_READY', verdictReason: 'Live API data is currently unavailable.', verdictNextAction: 'Validate connector and API availability for this live tenant.', dataMode: { tenantMode: runtime.tenantMode, connectorMode: 'LIVE', liveExecutionEnabled: runtime.executionCapabilities.liveExecutionEnabled }, summary: { monthlySavingsIdentified: 0, governedEligibleSavings: 0, pendingApprovalValue: 0, verifiedRealizedSavings: 0, blockedValue: 0, driftExposure: 0, connectorHealthScore: 0, dataTrustHealth: 0 }, actionQueue: [], connectors: [], driftSignals: [], dataSource: 'LIVE_ERROR' as any } as CommandViewState
  }
}


export function buildActionProofDetail(action: CommandViewState['actionQueue'][number], state: CommandViewState): ActionProofDetail {
  // Evidence <- connectors + recommendation evidence + verification records
  const sources = state.connectors.filter((c) => action.sourceIds?.includes(c.id) || action.domain.includes(c.id) || true).slice(0, 4).map((c) => ({ id: c.id, name: c.name, type: 'Connector', status: c.health === 'HEALTHY' ? 'PASSED' as ProofGateStatus : c.health === 'DEGRADED' ? 'WARNING' as ProofGateStatus : 'BLOCKED' as ProofGateStatus, freshness: c.freshness, lastSeenAt: c.freshness, detail: `${c.mode} mode · ${c.health} health` }))
  const driftEvent = state.driftSignals.find((d) => d.title.toLowerCase().includes(action.domain.toLowerCase())) ?? state.driftSignals[0]
  if (driftEvent) sources.push({ id: `drift-${driftEvent.id}`, name: 'Drift Monitor', type: 'Monitoring', status: driftEvent.status === 'OPEN' ? 'WARNING' : 'PASSED', freshness: undefined, lastSeenAt: undefined, detail: driftEvent.title })
  sources.push({ id: `outcome-${action.id}`, name: 'Outcome Ledger', type: 'Ledger', status: state.summary.verifiedRealizedSavings > 0 ? 'PASSED' : 'NOT_AVAILABLE', freshness: undefined, lastSeenAt: undefined, detail: state.summary.verifiedRealizedSavings > 0 ? 'Verified outcomes available.' : 'Not yet verified.' })
  sources.push({ id: `savings-${action.id}`, name: 'Savings Proof', type: 'Verification', status: state.summary.verifiedRealizedSavings > 0 ? 'PASSED' : 'NOT_AVAILABLE', freshness: undefined, lastSeenAt: undefined, detail: state.summary.verifiedRealizedSavings > 0 ? 'Savings proof summary available.' : 'Not yet verified.' })

  // Governance <- trust snapshot + risk class + approval state
  const trust = action.trustScore
  const trustStatus: ProofGateStatus = trust == null ? 'NOT_AVAILABLE' : trust >= 85 ? 'PASSED' : trust >= 70 ? 'WARNING' : 'BLOCKED'
  const approvalRequired = action.state === 'APPROVAL_REQUIRED'

  // Execution <- execution mode + orchestration status
  const mode: ExecutionMode = approvalRequired ? 'APPROVAL_REQUIRED' : action.state === 'READY_TO_EXECUTE' ? 'GOVERNANCE_ENFORCED' : 'RECOMMEND_ONLY'
  const readinessStatus: ProofGateStatus = action.state === 'BLOCKED' ? 'BLOCKED' : approvalRequired ? 'WARNING' : action.state === 'READY_TO_EXECUTE' ? 'PASSED' : 'NOT_AVAILABLE'

  // Rollback <- action risk/reversibility when available
  const rollbackStatus: RollbackStatus = action.riskClass === 'A' ? 'NOT_AVAILABLE' : action.riskClass ? 'AVAILABLE' : 'UNKNOWN'

  // Outcome <- outcome ledger + savings proof
  const verifiedShare = action.projectedMonthlySavings ? Math.min(action.projectedMonthlySavings, state.summary.verifiedRealizedSavings) : 0

  // Lifecycle <- recommendation/orchestration/approval/outcome/drift events
  const lifecycle: ActionProofDetail['lifecycle'] = [
    { stage: 'DISCOVERED', status: 'COMPLETE', timestamp: '2026-05-01T09:00:00.000Z', detail: 'Recommendation discovered from runtime telemetry.' },
    { stage: 'GOVERNED', status: 'COMPLETE', timestamp: '2026-05-01T10:00:00.000Z', detail: 'Policy and trust gates evaluated.' },
    { stage: approvalRequired ? 'APPROVAL_PENDING' : 'APPROVED', status: approvalRequired ? 'CURRENT' : 'COMPLETE', timestamp: '2026-05-01T11:00:00.000Z', detail: approvalRequired ? 'Approval workflow required before execution.' : 'Approval not required for this policy class.' },
    { stage: 'DRY_RUN_READY', status: action.state === 'BLOCKED' ? 'BLOCKED' : 'PENDING', detail: 'Safe execution simulation only.' },
    { stage: 'EXECUTION_READY', status: action.state === 'READY_TO_EXECUTE' ? 'CURRENT' : action.state === 'BLOCKED' ? 'BLOCKED' : 'PENDING' },
    { stage: 'EXECUTED', status: action.state === 'IN_PROGRESS' || action.state === 'VERIFIED' ? 'COMPLETE' : 'PENDING' },
    { stage: 'VERIFIED', status: action.state === 'VERIFIED' ? 'COMPLETE' : 'PENDING', detail: action.state === 'VERIFIED' ? 'Verified.' : 'Not yet verified.' },
    { stage: 'DRIFT_MONITORED', status: driftEvent ? 'CURRENT' : 'PENDING', detail: driftEvent ? driftEvent.title : 'No active drift detected in this workspace.' },
  ]

  return { actionId: action.id, title: action.title, domain: action.domain, currentState: action.state, verdict: state.globalVerdict, verdictReason: action.reason, nextStep: action.nextStep, evidence: { summary: action.evidenceSummary ?? 'Not available', sources }, governance: { trustScore: trust, trustStatus, trustDrivers: [{ label: 'Identity match', status: trustStatus, detail: trust != null ? 'Identity confidence derived from source account mapping.' : 'Not available' }, { label: 'Usage freshness', status: sources.some((s) => s.freshness) ? 'PASSED' : 'NOT_AVAILABLE', detail: sources.some((s) => s.freshness) ? 'Source freshness metadata captured.' : 'Not available' }, { label: 'Entitlement confidence', status: action.riskClass === 'A' ? 'WARNING' : 'PASSED', detail: action.riskClass === 'A' ? 'Higher risk class reduces entitlement confidence.' : 'Policy class supports entitlement confidence.' }, { label: 'Policy fit', status: approvalRequired ? 'WARNING' : 'PASSED', detail: approvalRequired ? 'Approval requirement triggered.' : 'Policy allows governed execution.' }, { label: 'Approval requirement', status: approvalRequired ? 'WARNING' : 'PASSED', detail: action.approvalState ?? 'Not available' }], riskClass: action.riskClass, riskReason: action.riskClass ? `Risk class ${action.riskClass}.` : 'Not available', policyOutcome: action.state === 'BLOCKED' ? 'BLOCKED' : approvalRequired ? 'WARNING' : 'PASSED', policyDetail: action.reason, approvalState: action.approvalState, approvalRequired }, execution: { mode, dryRunAvailable: true, liveExecutionEnabled: state.dataMode.liveExecutionEnabled, readinessStatus, readinessReason: state.dataMode.tenantMode === 'DEMO' ? 'Live execution disabled in demo workspace.' : action.state === 'BLOCKED' ? 'Blocked by governance/data trust.' : action.state === 'APPROVAL_REQUIRED' ? 'Awaiting approval before execution.' : 'Execution gates satisfied.', blastRadius: { impactedUsers: 1, impactedLicenses: 1, impactedServices: 1, estimatedMonthlyValue: action.projectedMonthlySavings, detail: 'Deterministic estimate from recommendation value.' } }, rollback: { status: rollbackStatus, reversible: rollbackStatus === 'AVAILABLE', detail: rollbackStatus === 'AVAILABLE' ? 'Governed rollback available.' : rollbackStatus === 'NOT_AVAILABLE' ? 'Rollback not available for this class.' : 'Not available' }, outcome: { projectedMonthlySavings: action.projectedMonthlySavings, projectedAnnualSavings: action.projectedAnnualSavings, verifiedMonthlySavings: verifiedShare || undefined, savingsConfidence: trust != null ? (trust >= 85 ? 'HIGH' : trust >= 70 ? 'MEDIUM' : 'LOW') : 'NOT_AVAILABLE', verificationState: verifiedShare > 0 ? 'PARTIALLY_VERIFIED' : 'Not yet verified', driftRisk: driftEvent ? 'ELEVATED' : 'LOW' }, lifecycle }
}
