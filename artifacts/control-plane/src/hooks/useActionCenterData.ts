import { useCallback, useEffect, useMemo, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

export type GovernedActionStatus = 'DISCOVERED' | 'PRIORITISED' | 'READY' | 'AWAITING_APPROVAL' | 'APPROVED' | 'QUEUED' | 'EXECUTING' | 'EXECUTED' | 'VERIFYING' | 'VERIFIED' | 'RETAINED' | 'DRIFTED' | 'CLOSED' | 'CANCELLED' | 'REJECTED'
export type GovernedActionReadiness = 'ELIGIBLE' | 'APPROVAL_REQUIRED' | 'BLOCKED'
export type AuthorityVerdict = 'ELIGIBLE' | 'APPROVAL_REQUIRED' | 'BLOCKED' | 'NEVER_ELIGIBLE'
export type AuthorityConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export type ReadinessDimensionResult = { dimension: 'IDENTITY_TRUST' | 'USAGE_TRUST' | 'OWNERSHIP_TRUST' | 'FINANCIAL_TRUST' | 'CONNECTOR_TRUST' | 'APPROVAL_TRUST' | 'ROLLBACK_TRUST' | 'EXECUTION_TRUST' | 'EVIDENCE_TRUST'; status: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN'; score: number; reason: string; evidenceIds: string[] }
export type ReadinessBlocker = { id: string; dimension: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; reason: string; requiredAction: string }
export type MissingEvidence = { id: string; evidenceType: 'IDENTITY' | 'USAGE' | 'OWNER' | 'FINANCIAL' | 'APPROVAL' | 'CONNECTOR' | 'ROLLBACK' | 'EXECUTION' | 'OUTCOME'; reason: string; requiredSource?: string }
export type RequiredReadinessAction = { id: string; actionType: 'ASSIGN_OWNER' | 'REFRESH_CONNECTOR' | 'COLLECT_USAGE_EVIDENCE' | 'COLLECT_FINANCIAL_EVIDENCE' | 'REQUEST_APPROVAL' | 'ADD_ROLLBACK_PLAN' | 'MANUAL_REVIEW' | 'BLOCK_EXECUTION'; ownerRole: 'APPLICATION_OWNER' | 'FINANCE_OWNER' | 'IT_OWNER' | 'GOVERNANCE_OWNER' | 'EXECUTIVE_SPONSOR' | 'CERTEN_OPERATOR'; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; description: string }
export type ActionReadinessReport = { verdict: AuthorityVerdict; confidence: AuthorityConfidence; generatedAt: string; dimensions: ReadinessDimensionResult[]; blockers: ReadinessBlocker[]; missingEvidence: MissingEvidence[]; requiredActions: RequiredReadinessAction[]; evidenceIds: string[]; summary: string }
export type ReadinessDashboardSummary = { eligible: number; approvalRequired: number; blocked: number; neverEligible: number; highConfidence: number; missingEvidence: number; topBlockers: ReadinessBlocker[]; requiredActions: RequiredReadinessAction[] }

export type GovernedAction = {
  id: string; tenantId: string; title: string; description?: string; domain: 'M365' | 'AI' | 'SAAS' | 'CLOUD' | 'ITAM' | 'DATA' | 'OTHER'; sourceType: 'OPPORTUNITY' | 'RECOMMENDATION' | 'GOVERNANCE_FINDING' | 'DRIFT_EVENT' | 'MANUAL'; sourceId: string; ownerId?: string; approverId?: string; status: GovernedActionStatus; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; readiness: GovernedActionReadiness; trustScore?: number; projectedMonthlyValue?: number; projectedAnnualValue?: number; actualMonthlyValue?: number; actualAnnualValue?: number; blastRadius: 'LOW' | 'MEDIUM' | 'HIGH'; rollbackCapability: 'FULL' | 'PARTIAL' | 'NONE'; recommendationIds: string[]; evidenceIds: string[]; outcomeIds: string[]; executionReadiness?: AuthorityVerdict; executionStatus?: 'PLANNED' | 'DRY_RUN' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK'; latestExecutionId?: string; dryRunAvailable?: boolean; readinessAuthorityVerdict?: AuthorityVerdict; readinessAuthorityConfidence?: AuthorityConfidence; readinessAuthorityGeneratedAt?: string; readinessBlockerCount?: number; missingEvidenceCount?: number; requiredReadinessActionCount?: number; createdAt: string; updatedAt: string
}

export type ActionCenterSummary = { ready: number; awaitingApproval: number; approved: number; executing: number; verifying: number; verified: number; retained: number; drifted: number; blocked: number; projectedValue: number; verifiedValue: number }
export type ActionCenterDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'
export type ActionCenterData = { summary: ActionCenterSummary; readinessSummary: ReadinessDashboardSummary; actions: GovernedAction[]; isDemo: boolean; dataState: ActionCenterDataState; error?: string }
export type GovernedActionHistoryEvent = { id: string; eventType: string; actor?: string; notes?: string; createdAt: string }
export type GovernedActionEvidenceSummary = { actionId: string; totalEvidence: number; evidenceIds: string[]; bySource?: Record<string, string[]>; recommendationIds?: string[]; outcomeIds?: string[] }
export type GovernedActionDetail = { history: GovernedActionHistoryEvent[]; evidence: GovernedActionEvidenceSummary | null; readinessReport?: ActionReadinessReport | null; error?: string }

export const actionCenterApiPaths = ['/api/actions/dashboard', '/api/actions', '/api/trust-readiness/dashboard']
const emptySummary: ActionCenterSummary = { ready: 0, awaitingApproval: 0, approved: 0, executing: 0, verifying: 0, verified: 0, retained: 0, drifted: 0, blocked: 0, projectedValue: 0, verifiedValue: 0 }
const emptyReadinessSummary: ReadinessDashboardSummary = { eligible: 0, approvalRequired: 0, blocked: 0, neverEligible: 0, highConfidence: 0, missingEvidence: 0, topBlockers: [], requiredActions: [] }

export const readinessDimensionOrder: ReadinessDimensionResult['dimension'][] = ['IDENTITY_TRUST', 'USAGE_TRUST', 'OWNERSHIP_TRUST', 'FINANCIAL_TRUST', 'CONNECTOR_TRUST', 'APPROVAL_TRUST', 'ROLLBACK_TRUST', 'EXECUTION_TRUST', 'EVIDENCE_TRUST']
const demoDimensions = (status: ReadinessDimensionResult['status'] = 'PASS'): ReadinessDimensionResult[] => readinessDimensionOrder.map((dimension, index) => ({ dimension, status: index === 1 && status === 'WARN' ? 'WARN' : status, score: status === 'PASS' ? 92 : status === 'WARN' ? 64 : 20, reason: `${dimension.replace(/_/g, ' ')} evaluated for demo readiness.`, evidenceIds: status === 'FAIL' ? [] : [`evidence-${dimension.toLowerCase()}`] }))
const demoReport = (verdict: AuthorityVerdict, confidence: AuthorityConfidence, overrides: Partial<ActionReadinessReport> = {}): ActionReadinessReport => ({ verdict, confidence, generatedAt: '2026-06-08T09:00:00.000Z', dimensions: demoDimensions(verdict === 'ELIGIBLE' ? 'PASS' : verdict === 'APPROVAL_REQUIRED' ? 'WARN' : 'FAIL'), blockers: verdict === 'ELIGIBLE' ? [] : [{ id: `${verdict}-blocker`, dimension: verdict === 'NEVER_ELIGIBLE' ? 'EXECUTION_TRUST' : 'CONNECTOR_TRUST', severity: verdict === 'NEVER_ELIGIBLE' ? 'CRITICAL' : 'HIGH', reason: `${verdict} readiness condition requires attention.`, requiredAction: verdict === 'APPROVAL_REQUIRED' ? 'Request approval or refresh connector.' : 'Block execution until trust evidence is restored.' }], missingEvidence: verdict === 'ELIGIBLE' ? [] : [{ id: `${verdict}-missing`, evidenceType: verdict === 'BLOCKED' ? 'OWNER' : 'CONNECTOR', reason: 'Demo readiness evidence gap.', requiredSource: 'Trust & Readiness Authority' }], requiredActions: verdict === 'ELIGIBLE' ? [] : [{ id: `${verdict}-required`, actionType: verdict === 'APPROVAL_REQUIRED' ? 'REQUEST_APPROVAL' : 'BLOCK_EXECUTION', ownerRole: verdict === 'APPROVAL_REQUIRED' ? 'GOVERNANCE_OWNER' : 'CERTEN_OPERATOR', priority: verdict === 'NEVER_ELIGIBLE' ? 'CRITICAL' : 'HIGH', description: `${verdict} requires operator follow-up before execution.` }], evidenceIds: verdict === 'ELIGIBLE' ? ['identity-proof', 'usage-proof', 'financial-proof'] : ['partial-proof'], summary: `${verdict}: demo Trust & Readiness Authority summary.`, ...overrides })

export const demoReadinessReports: Record<string, ActionReadinessReport> = {
  'ga-ready-approval': demoReport('APPROVAL_REQUIRED', 'MEDIUM'),
  'ga-awaiting-approval': demoReport('APPROVAL_REQUIRED', 'MEDIUM'),
  'ga-executing': demoReport('ELIGIBLE', 'HIGH'),
  'ga-verifying': demoReport('ELIGIBLE', 'HIGH'),
  'ga-retained': demoReport('ELIGIBLE', 'HIGH'),
  'ga-closed': demoReport('BLOCKED', 'LOW'),
  'ga-never-eligible': demoReport('NEVER_ELIGIBLE', 'LOW'),
}

export const demoGovernedActions: GovernedAction[] = [
  { id: 'ga-ready-approval', tenantId: 'demo-sandbox-tenant', title: 'Disable stale Microsoft 365 licences', description: 'Approval-gated reclaim for inactive E5 seats with rollback notes and user evidence.', domain: 'M365', sourceType: 'RECOMMENDATION', sourceId: 'rec-m365-stale', ownerId: 'finops-owner', approverId: 'it-approver', status: 'READY', priority: 'HIGH', readiness: 'APPROVAL_REQUIRED', executionReadiness: 'APPROVAL_REQUIRED', readinessAuthorityVerdict: 'APPROVAL_REQUIRED', readinessAuthorityConfidence: 'MEDIUM', readinessBlockerCount: 1, missingEvidenceCount: 1, requiredReadinessActionCount: 1, executionStatus: 'PLANNED', dryRunAvailable: true, trustScore: 0.91, projectedMonthlyValue: 4200, projectedAnnualValue: 50400, blastRadius: 'LOW', rollbackCapability: 'FULL', recommendationIds: ['rec-m365-stale'], evidenceIds: ['rec-evidence-m365-usage', 'exec-proof-dry-run'], outcomeIds: [], createdAt: '2026-06-01T09:00:00.000Z', updatedAt: '2026-06-07T13:00:00.000Z' },
  { id: 'ga-awaiting-approval', tenantId: 'demo-sandbox-tenant', title: 'Rightsize over-provisioned cloud databases', description: 'Approval request for production database tier reduction after workload review.', domain: 'CLOUD', sourceType: 'OPPORTUNITY', sourceId: 'opp-cloud-db', ownerId: 'cloud-ops', approverId: 'platform-lead', status: 'AWAITING_APPROVAL', priority: 'CRITICAL', readiness: 'APPROVAL_REQUIRED', executionReadiness: 'APPROVAL_REQUIRED', readinessAuthorityVerdict: 'APPROVAL_REQUIRED', readinessAuthorityConfidence: 'MEDIUM', readinessBlockerCount: 1, missingEvidenceCount: 1, requiredReadinessActionCount: 1, executionStatus: 'PLANNED', dryRunAvailable: true, trustScore: 0.87, projectedMonthlyValue: 8800, projectedAnnualValue: 105600, blastRadius: 'HIGH', rollbackCapability: 'PARTIAL', recommendationIds: ['rec-cloud-db'], evidenceIds: ['rec-evidence-cloud-utilisation'], outcomeIds: [], createdAt: '2026-06-02T10:30:00.000Z', updatedAt: '2026-06-07T15:15:00.000Z' },
  { id: 'ga-executing', tenantId: 'demo-sandbox-tenant', title: 'Retire duplicate SaaS workspaces', description: 'Execution in progress for workspace consolidation with owner notifications.', domain: 'SAAS', sourceType: 'RECOMMENDATION', sourceId: 'rec-saas-duplicate', ownerId: 'saas-admin', approverId: 'finance-approver', status: 'EXECUTING', priority: 'MEDIUM', readiness: 'ELIGIBLE', executionReadiness: 'ELIGIBLE', readinessAuthorityVerdict: 'ELIGIBLE', readinessAuthorityConfidence: 'HIGH', readinessBlockerCount: 0, missingEvidenceCount: 0, requiredReadinessActionCount: 0, executionStatus: 'EXECUTING', latestExecutionId: 'gexec-demo-saas', dryRunAvailable: true, trustScore: 0.79, projectedMonthlyValue: 1900, projectedAnnualValue: 22800, blastRadius: 'MEDIUM', rollbackCapability: 'PARTIAL', recommendationIds: ['rec-saas-duplicate'], evidenceIds: ['rec-evidence-saas-contract', 'exec-proof-change-ticket'], outcomeIds: [], createdAt: '2026-06-03T08:00:00.000Z', updatedAt: '2026-06-08T08:00:00.000Z' },
  { id: 'ga-verifying', tenantId: 'demo-sandbox-tenant', title: 'Compress AI model routing policy', description: 'Execution completed; spend and token reductions are awaiting verification.', domain: 'AI', sourceType: 'RECOMMENDATION', sourceId: 'rec-ai-routing', ownerId: 'ai-platform', approverId: 'cto-office', status: 'VERIFYING', priority: 'HIGH', readiness: 'ELIGIBLE', executionReadiness: 'ELIGIBLE', readinessAuthorityVerdict: 'ELIGIBLE', readinessAuthorityConfidence: 'HIGH', readinessBlockerCount: 0, missingEvidenceCount: 0, requiredReadinessActionCount: 0, executionStatus: 'COMPLETED', latestExecutionId: 'gexec-demo-ai', dryRunAvailable: true, trustScore: 0.84, projectedMonthlyValue: 6100, projectedAnnualValue: 73200, actualMonthlyValue: 5800, actualAnnualValue: 69600, blastRadius: 'MEDIUM', rollbackCapability: 'FULL', recommendationIds: ['rec-ai-routing'], evidenceIds: ['rec-evidence-ai-spend', 'exec-proof-routing-change', 'outcome-proof-token-drop'], outcomeIds: ['outcome-ai-routing'], createdAt: '2026-06-04T11:00:00.000Z', updatedAt: '2026-06-08T09:20:00.000Z' },
  { id: 'ga-retained', tenantId: 'demo-sandbox-tenant', title: 'Retain verified Snowflake warehouse savings', description: 'Verified savings are retained and monitored for recurrence or drift.', domain: 'DATA', sourceType: 'DRIFT_EVENT', sourceId: 'drift-snowflake-warehouse', ownerId: 'data-platform', approverId: 'finops-lead', status: 'RETAINED', priority: 'MEDIUM', readiness: 'ELIGIBLE', executionReadiness: 'ELIGIBLE', readinessAuthorityVerdict: 'ELIGIBLE', readinessAuthorityConfidence: 'HIGH', readinessBlockerCount: 0, missingEvidenceCount: 0, requiredReadinessActionCount: 0, executionStatus: 'COMPLETED', latestExecutionId: 'gexec-demo-data', dryRunAvailable: true, trustScore: 0.93, projectedMonthlyValue: 3200, projectedAnnualValue: 38400, actualMonthlyValue: 3000, actualAnnualValue: 36000, blastRadius: 'LOW', rollbackCapability: 'FULL', recommendationIds: ['rec-data-warehouse'], evidenceIds: ['rec-evidence-data-idle', 'outcome-proof-bill-drop'], outcomeIds: ['outcome-data-warehouse'], createdAt: '2026-05-28T14:00:00.000Z', updatedAt: '2026-06-08T07:30:00.000Z' },
  { id: 'ga-closed', tenantId: 'demo-sandbox-tenant', title: 'Close rejected manual ITAM cleanup', description: 'Manual cleanup was rejected because ownership evidence was incomplete.', domain: 'ITAM', sourceType: 'MANUAL', sourceId: 'manual-itam-cleanup', ownerId: 'itam-owner', approverId: 'asset-governance', status: 'REJECTED', priority: 'LOW', readiness: 'BLOCKED', executionReadiness: 'BLOCKED', readinessAuthorityVerdict: 'BLOCKED', readinessAuthorityConfidence: 'LOW', readinessBlockerCount: 1, missingEvidenceCount: 1, requiredReadinessActionCount: 1, executionStatus: 'FAILED', dryRunAvailable: false, trustScore: 0.42, projectedMonthlyValue: 700, projectedAnnualValue: 8400, blastRadius: 'LOW', rollbackCapability: 'NONE', recommendationIds: [], evidenceIds: ['rec-evidence-itam-gap'], outcomeIds: [], createdAt: '2026-06-01T12:00:00.000Z', updatedAt: '2026-06-06T17:00:00.000Z' },
  { id: 'ga-never-eligible', tenantId: 'demo-sandbox-tenant', title: 'Legacy destructive workflow blocked permanently', description: 'Never eligible because execution support and rollback evidence are not available.', domain: 'OTHER', sourceType: 'MANUAL', sourceId: 'manual-legacy-risk', status: 'CANCELLED', priority: 'CRITICAL', readiness: 'BLOCKED', executionReadiness: 'NEVER_ELIGIBLE', readinessAuthorityVerdict: 'NEVER_ELIGIBLE', readinessAuthorityConfidence: 'LOW', readinessBlockerCount: 1, missingEvidenceCount: 1, requiredReadinessActionCount: 1, executionStatus: 'FAILED', dryRunAvailable: false, trustScore: 0.12, projectedAnnualValue: 0, blastRadius: 'HIGH', rollbackCapability: 'NONE', recommendationIds: [], evidenceIds: [], outcomeIds: [], createdAt: '2026-06-05T12:00:00.000Z', updatedAt: '2026-06-06T18:00:00.000Z' },
]

export function summarizeActions(actions: GovernedAction[]): ActionCenterSummary {
  return { ...emptySummary, ready: actions.filter((action) => action.status === 'READY').length, awaitingApproval: actions.filter((action) => action.status === 'AWAITING_APPROVAL').length, approved: actions.filter((action) => action.status === 'APPROVED').length, executing: actions.filter((action) => action.status === 'EXECUTING').length, verifying: actions.filter((action) => action.status === 'VERIFYING').length, verified: actions.filter((action) => action.status === 'VERIFIED').length, retained: actions.filter((action) => action.status === 'RETAINED').length, drifted: actions.filter((action) => action.status === 'DRIFTED').length, blocked: actions.filter((action) => action.readiness === 'BLOCKED').length, projectedValue: actions.reduce((sum, action) => sum + (action.projectedAnnualValue ?? action.projectedMonthlyValue ?? 0), 0), verifiedValue: actions.filter((action) => ['VERIFIED', 'RETAINED', 'CLOSED'].includes(action.status)).reduce((sum, action) => sum + (action.actualAnnualValue ?? action.actualMonthlyValue ?? 0), 0) }
}
export function summarizeReadinessReports(reports: Record<string, ActionReadinessReport>): ReadinessDashboardSummary {
  const list = Object.values(reports)
  return { eligible: list.filter((r) => r.verdict === 'ELIGIBLE').length, approvalRequired: list.filter((r) => r.verdict === 'APPROVAL_REQUIRED').length, blocked: list.filter((r) => r.verdict === 'BLOCKED').length, neverEligible: list.filter((r) => r.verdict === 'NEVER_ELIGIBLE').length, highConfidence: list.filter((r) => r.confidence === 'HIGH').length, missingEvidence: list.reduce((sum, r) => sum + r.missingEvidence.length, 0), topBlockers: list.flatMap((r) => r.blockers).slice(0, 5), requiredActions: list.flatMap((r) => r.requiredActions).slice(0, 5) }
}
export const demoActionCenterData: ActionCenterData = { summary: summarizeActions(demoGovernedActions), readinessSummary: summarizeReadinessReports(demoReadinessReports), actions: demoGovernedActions, isDemo: true, dataState: 'DEMO' }
const notConnectedActionCenterData: ActionCenterData = { summary: emptySummary, readinessSummary: emptyReadinessSummary, actions: [], isDemo: false, dataState: 'NOT_CONNECTED' }
function normalizeSummary(value: Partial<ActionCenterSummary> | null | undefined): ActionCenterSummary { return { ...emptySummary, ...(value ?? {}) } }
function normalizeReadinessSummary(value: Partial<ReadinessDashboardSummary> | null | undefined): ReadinessDashboardSummary { return { ...emptyReadinessSummary, ...(value ?? {}) } }
function normalizeActions(value: unknown): GovernedAction[] { return Array.isArray(value) ? value as GovernedAction[] : [] }

export function useActionCenterData() {
  const workspace = useWorkspace()
  const [data, setData] = useState<ActionCenterData>(() => workspace.mode === 'demo' ? demoActionCenterData : notConnectedActionCenterData)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') { setData(demoActionCenterData); return demoActionCenterData }
    if (!workspace.dataReady) { setData(notConnectedActionCenterData); return notConnectedActionCenterData }
    setLoading(true)
    try {
      const [summary, actions, readinessSummary] = await Promise.all([liveFetch<ActionCenterSummary>('/api/actions/dashboard'), liveFetch<GovernedAction[]>('/api/actions'), liveFetch<ReadinessDashboardSummary>('/api/trust-readiness/dashboard')])
      const normalizedActions = normalizeActions(actions)
      const next: ActionCenterData = { summary: normalizeSummary(summary), actions: normalizedActions, readinessSummary: normalizeReadinessSummary(readinessSummary), isDemo: false, dataState: normalizedActions.length === 0 ? 'NO_DATA' : 'LIVE' }
      setData(next)
      return next
    } catch (error) {
      const err = normalizeApiError(error)
      const fallback: ActionCenterData = { summary: emptySummary, readinessSummary: emptyReadinessSummary, actions: [], isDemo: false, dataState: 'NO_DATA', error: err.message }
      setData(fallback)
      return fallback
    } finally { setLoading(false) }
  }, [workspace.mode, workspace.dataReady])

  const fetchReadinessReport = useCallback(async (actionId: string): Promise<ActionReadinessReport | null> => {
    if (data.isDemo || workspace.mode === 'demo') return demoReadinessReports[actionId] ?? null
    try { return await liveFetch<ActionReadinessReport>(`/api/trust-readiness/actions/${actionId}`) } catch { return null }
  }, [data.isDemo, workspace.mode])

  const evaluateReadiness = useCallback(async (actionId: string): Promise<ActionReadinessReport | null> => {
    if (data.isDemo || workspace.mode === 'demo') return demoReadinessReports[actionId] ?? null
    const report = await liveFetch<ActionReadinessReport>(`/api/trust-readiness/actions/${actionId}/evaluate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actor: 'control-plane' }) })
    await refresh()
    return report
  }, [data.isDemo, workspace.mode, refresh])

  const transitionAction = useCallback(async (actionId: string, targetStatus: GovernedActionStatus) => {
    if (data.isDemo || workspace.mode === 'demo') return { simulated: true, disabled: true }
    await liveFetch(`/api/actions/${actionId}/transition`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetStatus, actor: 'control-plane' }) })
    return refresh()
  }, [data.isDemo, workspace.mode, refresh])

  const fetchActionDetails = useCallback(async (actionId: string): Promise<GovernedActionDetail> => {
    if (data.isDemo || workspace.mode === 'demo') {
      const action = data.actions.find((item) => item.id === actionId)
      return { history: [{ id: `${actionId}-created`, eventType: 'CREATED', actor: 'system', notes: 'Demo governed action created', createdAt: action?.createdAt ?? new Date().toISOString() }, { id: `${actionId}-updated`, eventType: action?.status ?? 'READY', actor: 'operator', notes: 'Sample lifecycle state for Execution Center', createdAt: action?.updatedAt ?? new Date().toISOString() }], evidence: { actionId, totalEvidence: action?.evidenceIds.length ?? 0, evidenceIds: action?.evidenceIds ?? [], recommendationIds: action?.recommendationIds ?? [], outcomeIds: action?.outcomeIds ?? [] }, readinessReport: demoReadinessReports[actionId] ?? null }
    }
    try {
      const [history, evidence, readinessReport] = await Promise.all([liveFetch<GovernedActionHistoryEvent[]>(`/api/actions/${actionId}/history`), liveFetch<GovernedActionEvidenceSummary>(`/api/actions/${actionId}/evidence`), fetchReadinessReport(actionId)])
      return { history: Array.isArray(history) ? history : [], evidence, readinessReport }
    } catch (error) { return { history: [], evidence: null, readinessReport: null, error: normalizeApiError(error).message } }
  }, [data.actions, data.isDemo, workspace.mode, fetchReadinessReport])

  useEffect(() => { void refresh() }, [refresh])
  return useMemo(() => ({ ...data, loading, refresh, transitionAction, fetchActionDetails, fetchReadinessReport, evaluateReadiness }), [data, loading, refresh, transitionAction, fetchActionDetails, fetchReadinessReport, evaluateReadiness])
}
