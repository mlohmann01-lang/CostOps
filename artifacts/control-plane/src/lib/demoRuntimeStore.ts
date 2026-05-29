import { useSyncExternalStore } from 'react'
import {
  demoActions,
  demoApprovals,
  demoCampaigns,
  demoCommandMetrics,
  demoConnectorOps,
  demoConnectors,
  demoDrift,
  demoEvidenceAudit,
  demoExecution,
  demoGovernanceAuditLog,
  demoOutcomes,
  demoPostureSignals,
  demoPriorityActions,
  demoRecommendations,
  demoRuntimeHealth,
} from '../data/demo'

export type ActivityCategory = 'approval' | 'execution' | 'rollback' | 'drift' | 'connector' | 'evidence' | 'governance'

export interface DemoActivityEvent {
  id: string
  message: string
  category: ActivityCategory
  at: string
  timestamp: number
}

export interface DemoEvidenceEvent {
  id?: string
  at?: string
  title: string
  certId?: string
  actor?: string
  proofChain?: string[]
}

export interface DemoRuntimeState {
  actions: Array<any>
  recommendations: Array<any>
  approvals: typeof demoApprovals
  execution: typeof demoExecution
  campaigns: typeof demoCampaigns
  governanceAuditLog: Array<any>
  evidenceAudit: typeof demoEvidenceAudit
  outcomes: typeof demoOutcomes
  drift: typeof demoDrift
  runtimeHealth: typeof demoRuntimeHealth
  connectorOps: typeof demoConnectorOps
  connectors: typeof demoConnectors
  commandMetrics: typeof demoCommandMetrics
  posture: typeof demoPostureSignals
  priority: typeof demoPriorityActions
  activity: DemoActivityEvent[]
  executingIds: Record<string, 'QUEUED_FOR_EXECUTION' | 'EXECUTING' | 'VERIFIED'>
  rollbackNotices: Record<string, string>
}

type Listener = () => void

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const nowAgo = () => 'just now'
const cert = () => `GEC-2026-05-28-DEMO-${String(eventCounter).padStart(4, '0')}`
let eventCounter = 100

function normalizeName(value: string) {
  return value.toLowerCase().replace(/—/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

function actionMatchesName(action: any, item: string) {
  const left = normalizeName(action.action ?? action.name ?? '')
  const right = normalizeName(item)
  return left.includes(right) || right.includes(left) || left.split(' ').slice(0, 2).every((part: string) => right.includes(part))
}

function findAction(state: DemoRuntimeState, actionId: string) {
  return state.actions.find((action) => action.id === actionId) ?? state.actions.find((action) => actionMatchesName(action, actionId))
}

function findActionForExecution(state: DemoRuntimeState, execution: any) {
  return state.actions.find((action) => actionMatchesName(action, execution.action))
}

function approvalForAction(action: any) {
  return {
    id: `approval-${action.id}`,
    actionId: action.id,
    item: action.action,
    stage: action.blast === 'High' ? 'CAB approval' : 'Finance review',
    approver: action.blast === 'High' ? 'cab-chair@acme.com' : 'm.smith@acme.com',
    sla: '4h remaining',
  }
}

function executionForAction(action: any) {
  return {
    id: `exec-${action.id}`,
    actionId: action.id,
    action: action.action,
    actor: 'j.doe@acme.com',
    at: nowAgo(),
    risk: action.blast === 'High' ? 'High' : action.blast === 'Medium' ? 'Medium' : 'Low',
    rollback: action.rollback,
    saving: action.saving,
    status: 'Awaiting execution',
    simulated: true,
  }
}

function computeMetrics(state: DemoRuntimeState) {
  const eligibleNow = state.actions
    .filter((action) => ['eligible', 'approved', 'execution-ready'].includes(action.verdict))
    .reduce((sum, action) => sum + Number(action.saving ?? 0), 0)
  const pendingApproval = state.actions
    .filter((action) => ['approval-required', 'pending'].includes(action.verdict))
    .reduce((sum, action) => sum + Number(action.saving ?? 0), 0)
  const blockedManual = state.actions
    .filter((action) => ['blocked', 'never-eligible'].includes(action.verdict))
    .reduce((sum, action) => sum + Number(action.saving ?? 0), 0)
  state.commandMetrics = { ...state.commandMetrics, eligibleNow, pendingApproval, blockedManual }
}

function computeApprovalSummary(state: DemoRuntimeState) {
  state.approvals.summary = {
    ...state.approvals.summary,
    pending: state.approvals.pending.length,
    approvedToday: state.approvals.history.filter((item) => item.result === 'Approved').length,
    escalated: state.approvals.pending.filter((item) => String(item.sla).toLowerCase().includes('escalated')).length,
  }
}

function computeConnectorSummary(state: DemoRuntimeState) {
  const connectors = state.connectorOps.connectors
  state.connectorOps.summary = {
    configured: connectors.length,
    healthy: connectors.filter((connector) => connector.status === 'ready').length,
    degraded: connectors.filter((connector) => connector.status === 'degraded').length,
    failedJobs: connectors.filter((connector) => connector.failedJob !== 'None').length,
  }
  const healthy = state.connectors.filter((connector) => connector.health === 'HEALTHY').length
  const activeDrift = state.drift.filter((alert) => alert.status !== 'Resolved').length
  const pending = state.approvals.summary.pending
  state.posture = [
    { ...demoPostureSignals[0], value: `${pending} approval ${pending === 1 ? 'bottleneck' : 'bottlenecks'}`, tone: pending ? 'amber' : 'green' },
    { ...demoPostureSignals[1], value: `${healthy}/${state.connectors.length} connectors healthy`, tone: healthy === state.connectors.length ? 'green' : 'amber' },
    { ...demoPostureSignals[2], value: `${activeDrift} active drift ${activeDrift === 1 ? 'alert' : 'alerts'}`, tone: activeDrift ? 'amber' : 'green' },
  ] as any
}

function computeEvidenceStats(state: DemoRuntimeState) {
  state.evidenceAudit.stats = {
    ...state.evidenceAudit.stats,
    governanceEvents: state.evidenceAudit.timeline.length,
    proofChains: state.evidenceAudit.timeline.length,
  }
}

function computeDriftSummary(state: DemoRuntimeState) {
  computeConnectorSummary(state)
}

function computeDerived(state: DemoRuntimeState) {
  computeMetrics(state)
  computeApprovalSummary(state)
  computeConnectorSummary(state)
  computeEvidenceStats(state)
}

function createInitialState(): DemoRuntimeState {
  const state: DemoRuntimeState = {
    actions: clone(demoActions),
    recommendations: clone(demoRecommendations),
    approvals: clone(demoApprovals),
    execution: clone(demoExecution),
    campaigns: clone(demoCampaigns),
    governanceAuditLog: clone(demoGovernanceAuditLog),
    evidenceAudit: clone(demoEvidenceAudit),
    outcomes: clone(demoOutcomes),
    drift: clone(demoDrift),
    runtimeHealth: clone(demoRuntimeHealth),
    connectorOps: clone(demoConnectorOps),
    connectors: clone(demoConnectors),
    commandMetrics: clone(demoCommandMetrics),
    posture: clone(demoPostureSignals),
    priority: clone(demoPriorityActions),
    activity: [
      { id: 'act-seed-1', message: 'Snowflake auto-suspend verified', category: 'execution', at: '4m ago', timestamp: Date.now() - 240_000 },
      { id: 'act-seed-2', message: 'CAB approved AWS rightsize batch', category: 'approval', at: '18m ago', timestamp: Date.now() - 1_080_000 },
      { id: 'act-seed-3', message: 'Drift alert resolved', category: 'drift', at: '31m ago', timestamp: Date.now() - 1_860_000 },
      { id: 'act-seed-4', message: 'M365 connector degraded', category: 'connector', at: '3h ago', timestamp: Date.now() - 10_800_000 },
    ],
    executingIds: {},
    rollbackNotices: {},
  }
  state.approvals.pending = state.approvals.pending.map((item: any) => {
    const action = state.actions.find((candidate) => actionMatchesName(candidate, item.item))
    return { ...item, actionId: action?.id }
  }) as any
  computeDerived(state)
  return state
}

let state = createInitialState()
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((listener) => listener())
const setState = (updater: (draft: DemoRuntimeState) => void) => {
  const draft = clone(state)
  updater(draft)
  computeDerived(draft)
  state = draft
  emit()
}

export function getDemoRuntimeState() {
  return state
}

export function resetDemoRuntimeStore() {
  eventCounter = 100
  state = createInitialState()
  emit()
}

export function subscribeDemoRuntimeStore(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDemoRuntimeStore() {
  return useSyncExternalStore(subscribeDemoRuntimeStore, getDemoRuntimeState, getDemoRuntimeState)
}

export function appendActivity(message: string, category: ActivityCategory) {
  setState((draft) => {
    draft.activity.unshift({ id: `act-${eventCounter++}`, message, category, at: nowAgo(), timestamp: Date.now() })
  })
}

export function appendEvidenceEvent(event: DemoEvidenceEvent) {
  setState((draft) => {
    const id = event.id ?? `ea-${eventCounter++}`
    draft.evidenceAudit.timeline.unshift({
      id,
      at: event.at ?? nowAgo(),
      title: event.title,
      certId: event.certId ?? cert(),
      actor: event.actor ?? 'system',
      proofChain: event.proofChain ?? ['Evidence snapshot', 'Policy verdict', event.title, 'Runtime activity recorded'],
    })
    draft.governanceAuditLog.unshift({
      id: `g-${id}`,
      at: event.at ?? nowAgo(),
      action: event.title,
      verdict: event.title.includes('Approval') ? 'Approved' : 'Eligible',
      certId: event.certId ?? cert(),
      actor: event.actor ?? 'system',
    })
  })
}

export function simulateSubmitForApproval(actionId: string) {
  setState((draft) => {
    const action = findAction(draft, actionId)
    if (!action) return
    action.verdict = 'approval-required'
    const recommendation = draft.recommendations.find((item) => item.id === action.id)
    if (recommendation) recommendation.verdict = 'approval-required'
    if (!draft.approvals.pending.some((item: any) => item.actionId === action.id || item.item === action.action)) {
      draft.approvals.pending.unshift(approvalForAction(action) as any)
    }
    draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Submitted for approval', certId: cert(), actor: 'j.doe@acme.com', proofChain: ['Recommendation reviewed', 'Approval required', 'Submitted for approval'] })
    draft.governanceAuditLog.unshift({ id: `g-${eventCounter++}`, at: nowAgo(), action: `${action.action} submitted`, verdict: 'Approval required', certId: cert(), actor: 'j.doe@acme.com' })
    draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Submitted ${action.action} for approval`, category: 'approval', at: nowAgo(), timestamp: Date.now() })
  })
}

export function simulateApprove(actionId: string) {
  setState((draft) => {
    const action = findAction(draft, actionId)
    if (!action) return
    action.verdict = 'approved'
    action.status = 'Approved'
    const recommendation = draft.recommendations.find((item) => item.id === action.id)
    if (recommendation) {
      recommendation.verdict = 'approved'
      recommendation.status = 'Approved'
    }
    draft.approvals.pending = draft.approvals.pending.filter((item: any) => item.actionId !== action.id && !actionMatchesName(action, item.item)) as any
    if (!draft.approvals.history.some((item) => item.item === action.action && item.result === 'Approved')) {
      draft.approvals.history.unshift({ id: `h-${eventCounter++}`, item: action.action, result: 'Approved', approver: 'cab-chair@acme.com' })
    }
    if (!draft.execution.awaiting.some((item: any) => item.actionId === action.id || actionMatchesName(action, item.action))) {
      draft.execution.awaiting.unshift(executionForAction(action) as any)
    }
    const campaign = draft.campaigns.find((item) => action.domain === 'cloud' ? item.name.toLowerCase().includes('cloud') : item.name.toLowerCase().includes(action.domain))
    if (campaign) {
      campaign.approvals.pending = Math.max(0, campaign.approvals.pending - 1)
      campaign.approvals.approved += 1
      campaign.progress = Math.min(100, campaign.progress + 8)
    }
    draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Approval granted', certId: cert(), actor: 'cab-chair@acme.com', proofChain: ['Approval required', 'CAB approval', 'Approval granted', 'Awaiting execution'] })
    draft.governanceAuditLog.unshift({ id: `g-${eventCounter++}`, at: nowAgo(), action: `${action.action} approved`, verdict: 'Approved', certId: cert(), actor: 'cab-chair@acme.com' })
    draft.activity.unshift({ id: `act-${eventCounter++}`, message: `CAB approved ${action.action}`, category: 'approval', at: nowAgo(), timestamp: Date.now() })
  })
}


export function simulateRejectApproval(actionId: string) {
  setState((draft) => {
    const action = findAction(draft, actionId)
    const index = draft.approvals.pending.findIndex((item: any) => item.actionId === actionId || item.item === actionId || (action && actionMatchesName(action, item.item)))
    const item = index >= 0 ? draft.approvals.pending.splice(index, 1)[0] as any : undefined
    const title = action?.action ?? item?.item ?? actionId
    if (action) {
      action.verdict = 'blocked'
      action.status = 'Rejected'
      const recommendation = draft.recommendations.find((candidate) => candidate.id === action.id)
      if (recommendation) recommendation.verdict = 'blocked'
    }
    draft.approvals.history.unshift({ id: `h-${eventCounter++}`, item: title, result: 'Rejected', approver: item?.approver ?? 'risk.office@acme.com' })
    draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Approval rejected', certId: cert(), actor: item?.approver ?? 'risk.office@acme.com', proofChain: ['Approval reviewed', 'Rejected placeholder', 'Governance event recorded'] })
    draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Approval rejected for ${title}`, category: 'approval', at: nowAgo(), timestamp: Date.now() })
  })
}

export function simulateExecution(executionId: string) {
  setState((draft) => {
    draft.executingIds[executionId] = 'QUEUED_FOR_EXECUTION'
    const item = draft.execution.awaiting.find((entry) => entry.id === executionId)
    if (item) (item as any).status = 'Awaiting execution'
  })
  setTimeout(() => {
    setState((draft) => {
      draft.executingIds[executionId] = 'EXECUTING'
      const item = draft.execution.awaiting.find((entry) => entry.id === executionId)
      if (item) (item as any).status = 'Executing'
    })
  }, 250)
  setTimeout(() => {
    setState((draft) => {
      const index = draft.execution.awaiting.findIndex((entry) => entry.id === executionId)
      if (index === -1) return
      const [item] = draft.execution.awaiting.splice(index, 1)
      const action = findActionForExecution(draft, item)
      if (action) {
        action.verdict = 'verified'
        action.status = 'Verified'
        const recommendation = draft.recommendations.find((candidate) => candidate.id === action.id)
        if (recommendation) recommendation.verdict = 'verified'
      }
      draft.executingIds[executionId] = 'VERIFIED'
      const completed = { ...item, id: `completed-${item.id}`, at: nowAgo(), status: 'Verified', simulated: true, certId: cert() }
      draft.execution.completed.unshift(completed as any)
      draft.outcomes.ledger.unshift({ id: `outcome-${item.id}`, action: item.action, projected: item.saving, verified: item.saving, evidence: 'Evidence-backed', state: 'Verified', simulated: true } as any)
      const projected = draft.outcomes.ledger.reduce((sum, entry: any) => sum + Number(entry.projected ?? 0), 0)
      const verified = draft.outcomes.ledger.reduce((sum, entry: any) => sum + Number(entry.verified ?? 0), 0)
      draft.outcomes.stats = [projected, verified, verified - projected, draft.outcomes.ledger.filter((entry: any) => entry.state !== 'Verified').length, 0, draft.drift.filter((alert) => alert.status !== 'Resolved').length] as any
      draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Outcome verified', certId: completed.certId, actor: 'system', proofChain: ['Execution simulated', 'Telemetry sampled', 'Outcome verified', 'Evidence-backed'] })
      draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Execution simulated', certId: completed.certId, actor: 'system', proofChain: ['Queued for execution', 'Executing', 'Verified'] })
      draft.governanceAuditLog.unshift({ id: `g-${eventCounter++}`, at: nowAgo(), action: `${item.action} verified`, verdict: 'Eligible', certId: completed.certId, actor: 'system' })
      draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Outcome verified for ${item.action}`, category: 'execution', at: nowAgo(), timestamp: Date.now() })
      draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Execution simulated for ${item.action}`, category: 'execution', at: nowAgo(), timestamp: Date.now() })
    })
  }, 1250)
}

export function simulateRollback(executionId: string) {
  setState((draft) => {
    const item = draft.execution.completed.find((entry) => entry.id === executionId)
    if (!item) return
    draft.rollbackNotices[executionId] = `Rollback initiated for ${item.action}`
    draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Rollback initiated', certId: item.certId ?? cert(), actor: 'operator@acme.com', proofChain: ['Completed execution selected', 'Rollback initiated', 'Awaiting verification'] })
    draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Rollback initiated for ${item.action}`, category: 'rollback', at: nowAgo(), timestamp: Date.now() })
  })
}

export function simulateResolveDrift(alertId: string) {
  setState((draft) => {
    const alert = draft.drift.find((item) => item.id === alertId)
    if (!alert) return
    alert.status = 'Resolved'
    alert.atRisk = 0
    draft.evidenceAudit.timeline.unshift({ id: `ea-${eventCounter++}`, at: nowAgo(), title: 'Drift alert resolved', certId: cert(), actor: 'system', proofChain: ['Drift detected', 'Remediation applied', 'Resolved'] })
    draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Drift resolved for ${alert.title}`, category: 'drift', at: nowAgo(), timestamp: Date.now() })
    computeDriftSummary(draft)
  })
}

export function simulateConnectorRetry(connectorId: string) {
  setState((draft) => {
    const ops = draft.connectorOps.connectors.find((connector) => connector.id === connectorId)
    if (ops) {
      ops.status = 'testing'
      ops.nextRun = 'Testing connection now'
    }
    const hub = draft.connectors.find((connector) => connector.id === connectorId)
    if (hub) hub.health = 'TESTING' as any
    const runtime = draft.runtimeHealth.components.find((component) => component.id === 'connector-health')
    if (runtime) {
      runtime.status = 'active'
      runtime.wording = 'Connector retry testing'
    }
  })
  setTimeout(() => {
    setState((draft) => {
      const ops = draft.connectorOps.connectors.find((connector) => connector.id === connectorId)
      const hub = draft.connectors.find((connector) => connector.id === connectorId)
      const improveM365 = connectorId === 'm365' && Number(new Date('2026-05-28T00:00:00Z').getUTCDate()) % 2 === 0
      if (ops) {
        ops.status = connectorId === 'm365' && !improveM365 ? 'degraded' : 'ready'
        ops.freshness = ops.status === 'ready' ? '1m fresh' : ops.freshness
        ops.lastSync = ops.status === 'ready' ? '1m ago' : ops.lastSync
        ops.failedJob = ops.status === 'ready' ? 'None' : ops.failedJob
        ops.nextRun = ops.status === 'ready' ? 'Hourly' : 'Retry queued in 12m'
      }
      if (hub) {
        hub.health = connectorId === 'm365' && !improveM365 ? 'DEGRADED' : 'HEALTHY'
        hub.synced = hub.health === 'HEALTHY' ? '1m ago' : hub.synced
      }
      const name = ops?.name ?? hub?.name ?? connectorId
      const runtime = draft.runtimeHealth.components.find((component) => component.id === 'connector-health')
      if (runtime) {
        runtime.status = draft.connectorOps.connectors.some((connector) => connector.status === 'degraded') ? 'degraded' : 'ready'
        runtime.wording = runtime.status === 'degraded' ? 'Connector degraded' : 'Connector health ready'
      }
      draft.activity.unshift({ id: `act-${eventCounter++}`, message: `Connector retry completed for ${name}`, category: 'connector', at: nowAgo(), timestamp: Date.now() })
    })
  }, 1100)
}
