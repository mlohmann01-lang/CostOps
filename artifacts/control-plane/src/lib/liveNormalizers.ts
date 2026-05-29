import { normalizeRuntimeEvents } from './runtimeEventNormalizer'

export const emptyCommandMetrics = { totalIdentified: 0, eligibleNow: 0, pendingApproval: 0, blockedManual: 0, verifiedSavings: 0, pendingVerification: 0, failedVerification: 0, activeDrift: 0 }
export const emptyApprovals = { summary: { pending: 0, approvedToday: 0, escalated: 0, averageSlaHours: 0 }, pending: [] as any[], history: [] as any[] }
export const emptyExecution = { awaiting: [] as any[], completed: [] as any[] }
export const emptyOutcomes = { stats: [] as number[], ledger: [] as any[] }
export const emptySchedule = { summary: { upcoming: 0, completed: 0, blocked: 0, projectedSavings: 0 }, upcoming: [] as any[], past: [] as any[] }
export const emptyEvidenceAudit = { stats: { governanceEvents: 0, certsIssued: 0, proofChains: 0, exportsReady: 0 }, filters: [] as string[], timeline: [] as any[] }
export const emptyConnectorOps = { summary: { configured: 0, healthy: 0, degraded: 0, failedJobs: 0 }, connectors: [] as any[] }
export const emptyRuntimeHealth = { overallScore: 0, summary: '', components: [] as any[], activeIssues: [] as any[], recentEvents: [] as any[] }

const n = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0
const s = (value: unknown, fallback = '') => value === undefined || value === null || value === '' ? fallback : String(value)
const rows = (payload: unknown, keys: string[] = []) => {
  if (Array.isArray(payload)) return payload
  const object = (payload && typeof payload === 'object') ? payload as any : {}
  for (const key of keys) if (Array.isArray(object[key])) return object[key]
  if (Array.isArray(object.data)) return object.data
  if (Array.isArray(object.items)) return object.items
  if (Array.isArray(object.results)) return object.results
  return []
}
const state = (value: unknown) => s(value).toLowerCase().replace(/[\s_]+/g, '-')

export function normalizeRecommendation(row: any) {
  const id = s(row?.recommendationId ?? row?.id ?? row?.entityId, 'unknown')
  const saving = n(row?.saving ?? row?.savings ?? row?.monthlySavings ?? row?.projectedMonthlySavings ?? row?.estimatedSavings)
  const readiness = state(row?.verdict ?? row?.readiness ?? row?.executionReadiness ?? row?.recommendationState ?? row?.state ?? row?.status)
  const executionState = state(row?.executionRequestState ?? row?.latestDryRunState ?? row?.metadata?.latestDryRunState)
  const verdict = executionState.includes('ready-for-execution') ? 'ready-for-execution' : executionState.includes('dry-run-blocked') || executionState.includes('blocked') ? 'dry-run-blocked' : executionState.includes('pending-dry-run') ? 'pending-dry-run' : readiness.includes('approval') ? 'approval-required' : readiness.includes('block') ? 'blocked' : readiness.includes('never') ? 'never-eligible' : readiness.includes('verified') ? 'verified' : 'eligible'
  const target = s(row?.targetEntityId ?? row?.userPrincipalName ?? row?.userEmail ?? row?.entityId, 'target')
  const actionFallback = `${s(row?.actionType ?? row?.playbookName ?? row?.playbookId, 'Recommendation')} for ${target}`
  const domainRaw = s(row?.domain ?? row?.category ?? row?.connectorType ?? row?.connector ?? row?.playbookId, 'unknown')
  return {
    id,
    action: s(row?.action ?? row?.title ?? row?.name ?? row?.summary ?? row?.playbookName, actionFallback),
    domain: /m365|copilot|license/i.test(domainRaw) ? 'saas' : domainRaw.toLowerCase(),
    saving,
    verdict,
    blast: s(row?.blast ?? row?.blastRadius ?? row?.risk ?? row?.riskClass, 'Low'),
    rollback: s(row?.rollback ?? row?.rollbackClass ?? row?.rollbackAvailable, 'None'),
    confidence: n(row?.confidence ?? row?.score ?? row?.trustScore),
    proofChain: Array.isArray(row?.proofChain) ? row.proofChain : ['Live recommendation', 'Backend evidence', 'Governance readiness'],
    executionReadiness: s(row?.executionReadiness ?? row?.readiness, ''),
    approvalWorkflowId: row?.approvalWorkflowId ?? null,
    approvalState: row?.approvalState ?? null,
    approvalSubmittedAt: row?.approvalSubmittedAt ?? null,
    currentApprovalStage: row?.currentApprovalStage ?? null,
    executionRequestId: row?.executionRequestId ?? null,
    executionRequestState: row?.executionRequestState ?? null,
  }
}

export function normalizeRecommendations(payload: unknown) {
  return rows(payload, ['recommendations']).map(normalizeRecommendation).filter((item: any) => item.id !== 'unknown')
}

export function normalizeGovernanceRows(payload: unknown, tenantId?: string) {
  return normalizeRuntimeEvents(payload, { tenantId }).map((event) => ({ id: event.eventId, at: event.createdAt, action: event.message, verdict: event.type.includes('APPROVAL') ? 'Approval required' : event.severity === 'error' ? 'Never eligible' : 'Eligible', certId: event.entityId, actor: event.actorLabel ?? event.actorId ?? 'system' }))
}

export function normalizeOutcomes(payload: unknown) {
  const source = Array.isArray(payload) ? payload : (payload as any)
  const ledgerPayload = Array.isArray(source) ? source[0] : source
  const summaryPayload = Array.isArray(source) ? source[1] : source?.summary
  const ledger = rows(ledgerPayload, ['ledger', 'outcomes']).map((row: any) => ({ id: s(row?.id ?? row?.outcomeId, 'unknown'), action: s(row?.action ?? row?.title ?? row?.name, 'Untitled outcome'), projected: n(row?.projected ?? row?.projectedMonthlySavings), verified: row?.verified === null ? null : n(row?.verified ?? row?.verifiedMonthlySavings), evidence: s(row?.evidence ?? row?.evidenceSummary, row?.verified || row?.verifiedMonthlySavings ? 'Evidence-backed' : '—'), state: s(row?.state ?? row?.status, row?.verified || row?.verifiedMonthlySavings ? 'Verified' : 'Pending') })).filter((item: any) => item.id !== 'unknown')
  const projected = n(summaryPayload?.projected ?? summaryPayload?.projectedMonthlySavings ?? ledger.reduce((sum: number, row: any) => sum + n(row.projected), 0))
  const verified = n(summaryPayload?.verified ?? summaryPayload?.verifiedMonthlySavings ?? summaryPayload?.totalVerifiedSavings ?? ledger.reduce((sum: number, row: any) => sum + n(row.verified), 0))
  return { stats: [projected, verified, verified - projected, n(summaryPayload?.pending ?? summaryPayload?.verificationPending ?? summaryPayload?.pendingVerificationCount), n(summaryPayload?.failed ?? summaryPayload?.failedVerification ?? summaryPayload?.failedVerificationCount), n(summaryPayload?.driftDetected ?? summaryPayload?.activeDrift)], ledger }
}

export function normalizeApprovalWorkflows(payload: unknown) {
  const all = rows(payload, ['approvals', 'workflows'])
  const pending = all.filter((row: any) => state(row?.approvalState ?? row?.status ?? row?.result).includes('pending')).map((row: any) => ({ id: s(row?.workflowId ?? row?.id ?? row?.approvalId, 'unknown'), actionId: row?.targetId ?? row?.recommendationId, item: s(row?.item ?? row?.workflowName ?? row?.title ?? row?.recommendationTitle, 'Untitled approval'), stage: s(row?.approvalStages?.[row?.currentStage]?.stageName ?? row?.stage, 'Approval'), approver: s(row?.approver ?? row?.approverEmail ?? row?.approvalStages?.[row?.currentStage]?.requiredRoles?.join(', ') ?? row?.requiredRoles?.join(', '), 'unassigned'), sla: s(row?.sla ?? row?.slaStatus ?? row?.approvalState, 'No SLA') })).filter((item: any) => item.id !== 'unknown')
  const history = all.filter((row: any) => !state(row?.approvalState ?? row?.status ?? row?.result).includes('pending')).map((row: any) => ({ id: s(row?.workflowId ?? row?.id ?? row?.approvalId, 'unknown'), item: s(row?.item ?? row?.workflowName ?? row?.title ?? row?.recommendationTitle, 'Untitled approval'), result: s(row?.result ?? row?.approvalState ?? row?.status, 'Reviewed'), approver: s(row?.approver ?? row?.approverEmail, 'system') })).filter((item: any) => item.id !== 'unknown')
  return { summary: { pending: pending.length, approvedToday: history.filter((item: any) => state(item.result).includes('approved')).length, escalated: pending.filter((item: any) => state(item.sla).includes('escalated')).length, averageSlaHours: n((payload as any)?.summary?.averageSlaHours) }, pending, history }
}

export function normalizeExecution(payload: unknown) {
  const all = rows(payload, ['requests', 'executionRequests'])
  const isComplete = (row: any) => state(row?.latestExecutionResultState ?? row?.metadata?.latestExecutionResultState ?? row?.readinessState ?? row?.status ?? row?.executionState).includes('complete') || state(row?.latestExecutionResultState ?? row?.metadata?.latestExecutionResultState ?? row?.readinessState ?? row?.status ?? row?.executionState).includes('verified') || state(row?.latestExecutionResultState ?? row?.metadata?.latestExecutionResultState ?? row?.executionState).includes('executed')
  const toAction = (row: any, fallback: string) => s(row?.action ?? row?.title ?? row?.recommendationTitle ?? row?.actionType, fallback)
  return { awaiting: all.filter((row: any) => !isComplete(row)).map((row: any) => ({ id: s(row?.requestId ?? row?.executionRequestId ?? row?.id, 'unknown'), action: toAction(row, 'Untitled execution request'), platform: s(row?.platform, 'unknown'), actor: s(row?.actor ?? row?.requestedBy ?? row?.createdByWorkflowId, 'system'), at: s(row?.createdAt ?? row?.requestedAt ?? row?.at, ''), risk: s(row?.risk ?? row?.riskClass ?? row?.actionRiskClass, 'Low'), rollback: s(row?.rollbackCoverage ?? row?.rollback ?? row?.rollbackClass, 'None'), saving: n(row?.saving ?? row?.projectedMonthlySavings), readiness: s(row?.readinessState ?? row?.executionState ?? row?.status, 'PENDING_DRY_RUN'), latestDryRunState: row?.latestDryRunState ?? row?.metadata?.latestDryRunState, latestDryRunId: row?.latestDryRunId ?? row?.metadata?.latestDryRunId, rollbackSupported: row?.rollbackSupported ?? row?.metadata?.rollbackSupported, policyBlocksSummary: row?.policyBlocksSummary ?? row?.metadata?.policyBlocksSummary, validationWarnings: row?.metadata?.validationWarnings ?? [], validationErrors: row?.metadata?.validationErrors ?? [], latestExecutionResultId: row?.latestExecutionResultId ?? row?.metadata?.latestExecutionResultId, latestExecutionResultState: row?.latestExecutionResultState ?? row?.metadata?.latestExecutionResultState })).filter((item: any) => item.id !== 'unknown'), completed: all.filter((row: any) => isComplete(row)).map((row: any) => ({ id: s(row?.requestId ?? row?.executionRequestId ?? row?.id, 'unknown'), action: toAction(row, 'Untitled completed execution'), actor: s(row?.actor ?? row?.requestedBy, 'system'), at: s(row?.completedAt ?? row?.createdAt ?? row?.requestedAt ?? row?.at, ''), saving: n(row?.saving ?? row?.verifiedMonthlySavings ?? row?.projectedMonthlySavings), rollback: s(row?.rollbackCoverage ?? row?.rollback ?? row?.rollbackClass, 'None'), certId: s(row?.certId ?? row?.certificateId ?? row?.latestExecutionResultId ?? row?.metadata?.latestExecutionResultId, '—'), executionState: s(row?.latestExecutionResultState ?? row?.metadata?.latestExecutionResultState ?? row?.executionState, 'EXECUTED'), latestOutcomeId: row?.latestOutcomeId ?? row?.metadata?.latestOutcomeId, latestOutcomeState: row?.latestOutcomeState ?? row?.metadata?.latestOutcomeState, verifiedMonthlySavings: row?.verifiedMonthlySavings ?? row?.metadata?.verifiedMonthlySavings, savingsVariance: row?.savingsVariance ?? row?.metadata?.savingsVariance })).filter((item: any) => item.id !== 'unknown') }
}

export function normalizeConnectorOps(payload: unknown) {
  const connectors = rows(payload, ['connectors']).map((row: any) => { const status = state(row?.status ?? row?.health); const ready = status.includes('ready') || status.includes('healthy'); const degraded = status.includes('degraded') || status.includes('warn'); return { id: s(row?.id ?? row?.connectorId, 'unknown'), name: s(row?.name ?? row?.label, 'Unnamed connector'), status: ready ? 'ready' : degraded ? 'degraded' : 'blocked', freshness: s(row?.freshness ?? row?.lastSyncAge, ''), trust: n(row?.trust ?? row?.trustScore), lastSync: s(row?.lastSync ?? row?.lastSyncAt, 'Never'), failedJob: s(row?.failedJob ?? row?.lastError, ready ? 'None' : 'Unavailable'), nextRun: s(row?.nextRun ?? row?.nextRunAt, '') } }).filter((item: any) => item.id !== 'unknown')
  return { summary: { configured: connectors.length, healthy: connectors.filter((item: any) => item.status === 'ready').length, degraded: connectors.filter((item: any) => item.status === 'degraded').length, failedJobs: connectors.filter((item: any) => item.failedJob !== 'None').length }, connectors }
}

export function normalizeRuntimeHealth(payload: unknown) {
  const source = Array.isArray(payload) ? payload : [payload]
  const health = source[0] as any
  const status = source[1] as any
  const connectorOps = normalizeConnectorOps(source[2] ?? health?.connectors ?? [])
  const execution = normalizeExecution(source[4] ?? [])
  const executionWaiting = execution.awaiting.length
  const executionComponent = executionWaiting ? [{ id: 'execution-requests-waiting', name: 'Execution Requests Waiting', status: execution.awaiting.some((item: any) => state(item.readiness).includes('blocked')) ? 'blocked' : 'pending', wording: `Execution Requests Waiting: ${executionWaiting}`, detail: `Ready For Dry Run: ${execution.awaiting.filter((item: any) => state(item.readiness).includes('ready-for-dry-run') || state(item.readiness).includes('pending-dry-run')).length} · Blocked: ${execution.awaiting.filter((item: any) => state(item.readiness).includes('blocked')).length}` }] : []
  const components = rows(health?.components ?? status?.components ?? [], ['components']).map((row: any) => ({ id: s(row?.id, s(row?.name, 'component')), name: s(row?.name, 'Runtime component'), status: state(row?.status) || 'ready', wording: s(row?.wording ?? row?.summary ?? row?.status, 'Runtime status'), detail: s(row?.detail ?? row?.description, '') }))
  return { overallScore: n(health?.overallScore ?? health?.score ?? status?.score), summary: s(health?.summary ?? status?.summary, ''), components: [...(components.length ? components : connectorOps.connectors.map((connector: any) => ({ id: connector.id, name: connector.name, status: connector.status, wording: connector.status === 'ready' ? 'Connector ready' : 'Connector degraded', detail: connector.failedJob }))), ...executionComponent], activeIssues: connectorOps.connectors.filter((connector: any) => connector.status !== 'ready').map((connector: any) => ({ id: connector.id, severity: connector.status, title: connector.status === 'degraded' ? 'Connector degraded' : 'Connector unavailable', owner: 'Connector Ops', nextStep: connector.nextRun || connector.failedJob })), recentEvents: rows(health?.recentEvents ?? [], ['recentEvents']) }
}

export function normalizeCampaigns(payload: unknown) {
  return rows(payload, ['campaigns']).map((row: any) => ({ id: s(row?.id ?? row?.campaignId, 'unknown'), name: s(row?.name ?? row?.title, 'Untitled campaign'), projectedSavings: n(row?.projectedSavings ?? row?.projectedMonthlySavings), verifiedSavings: n(row?.verifiedSavings ?? row?.verifiedMonthlySavings), outcomeStatus: s(row?.outcomeStatus ?? row?.status, 'ACTIVE'), driftStatus: s(row?.driftStatus, 'MONITORED'), progress: n(row?.progress ?? row?.completionPercent), approvals: { pending: n(row?.approvals?.pending ?? row?.pendingApprovals), approved: n(row?.approvals?.approved ?? row?.approvedActions), blocked: n(row?.approvals?.blocked ?? row?.blockedActions) } })).filter((item: any) => item.id !== 'unknown')
}

export function normalizeSchedule(payload: unknown) {
  const all = rows(payload, ['schedules', 'items'])
  const upcoming = all.filter((row: any) => !state(row?.status).includes('complete')).map((row: any) => ({ id: s(row?.id ?? row?.scheduleId, 'unknown'), name: s(row?.name ?? row?.title, 'Scheduled window'), readiness: s(row?.readiness ?? row?.scheduleState ?? row?.status, 'Scheduled'), rollback: s(row?.rollback ?? row?.rollbackClass, 'None'), risk: s(row?.risk ?? row?.riskClass, 'Low'), dependencies: s(row?.dependencies ?? row?.dependencySummary, '') })).filter((item: any) => item.id !== 'unknown')
  const past = all.filter((row: any) => state(row?.status).includes('complete')).map((row: any) => ({ id: s(row?.id ?? row?.scheduleId, 'unknown'), name: s(row?.name ?? row?.title, 'Completed window'), readiness: 'Complete', rollback: s(row?.rollback ?? row?.rollbackClass, 'N/A'), risk: s(row?.risk ?? row?.riskClass, 'Low'), dependencies: s(row?.dependencies ?? row?.dependencySummary, '') })).filter((item: any) => item.id !== 'unknown')
  return { summary: { upcoming: upcoming.length, completed: past.length, blocked: upcoming.filter((item: any) => state(item.readiness).includes('block')).length, projectedSavings: all.reduce((sum: number, row: any) => sum + n(row?.projectedSavings ?? row?.projectedMonthlySavings), 0) }, upcoming, past }
}

export function normalizeEvidenceAudit(payload: unknown, tenantId?: string) {
  const events = normalizeRuntimeEvents(payload, { tenantId })
  const timeline = events.map((event) => ({ id: event.eventId, at: event.createdAt, title: event.message, certId: event.entityId, actor: event.actorLabel ?? event.actorId ?? 'system', proofChain: Array.isArray((event.payload as any)?.proofChain) ? (event.payload as any).proofChain : ['Live event', event.type, event.category] }))
  return { stats: { governanceEvents: timeline.length, certsIssued: timeline.filter((event) => event.certId?.startsWith('GEC-')).length, proofChains: timeline.length, exportsReady: 0 }, filters: ['Domain', 'Verdict', 'Actor', 'Certificate ID'], timeline }
}

export function normalizeCommandAggregate(payload: unknown) {
  const source = Array.isArray(payload) ? payload : []
  const actions = normalizeRecommendations(source[0] ?? [])
  const outcomes = normalizeOutcomes([[], source[1] ?? {}])
  const runtime = normalizeRuntimeHealth([source[2] ?? {}, {}, source[3] ?? []])
  const pendingApproval = actions.filter((action: any) => action.verdict === 'approval-required').reduce((sum: number, action: any) => sum + n(action.saving), 0)
  const eligibleNow = actions.filter((action: any) => action.verdict === 'eligible').reduce((sum: number, action: any) => sum + n(action.saving), 0)
  const blockedManual = actions.filter((action: any) => action.verdict === 'blocked' || action.verdict === 'never-eligible').reduce((sum: number, action: any) => sum + n(action.saving), 0)
  const totalIdentified = actions.reduce((sum: number, action: any) => sum + n(action.saving), 0) || n(outcomes.stats[0])
  const degraded = runtime.activeIssues.length
  return { actions, metrics: { totalIdentified, eligibleNow, pendingApproval, blockedManual, verifiedSavings: n(outcomes.stats[1]), pendingVerification: n(outcomes.stats[3]), failedVerification: n(outcomes.stats[4]), activeDrift: n(outcomes.stats[5]) }, posture: [{ id: 'governance', label: 'Governance posture', value: `${actions.filter((action: any) => action.verdict === 'approval-required').length} approval bottlenecks`, href: '/approval-workflows', tone: pendingApproval ? 'amber' : 'green' }, { id: 'connectors', label: 'Connector health', value: degraded ? `${degraded} connector issue${degraded === 1 ? '' : 's'}` : 'Connectors healthy', href: '/connectors', tone: degraded ? 'amber' : 'green' }, { id: 'runtime', label: 'Runtime health', value: runtime.summary || (runtime.overallScore ? `${runtime.overallScore}% healthy` : 'Runtime status unavailable'), href: '/runtime-health', tone: runtime.overallScore >= 80 ? 'green' : 'amber' }], priority: actions.slice(0, 3).map((action: any) => ({ id: action.id, text: `${action.action} — ${action.verdict}`, href: '/recommendations' })) }
}
