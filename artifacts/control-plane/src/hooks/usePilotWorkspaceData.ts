import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useRuntimeContext } from '../lib/runtimeContext'
import { useM365OnboardingData } from './useM365OnboardingData'
import { useConnectorHubData } from './useConnectorHubData'
import { useDataTrustData } from './useDataTrustData'
import { useRecommendationsData } from './useRecommendationsData'
import { useOutcomesData } from './useOutcomesData'
import { useExecutionData } from './useExecutionData'
import { useEvidencePacks } from './useEvidencePacks'
import { useExecutiveValueData } from './useExecutiveValueData'

type ReadinessState = 'Ready' | 'Needs attention' | 'Blocked' | 'Review required' | 'Evidence ready' | 'Value identified' | 'Value verified'

type ActionPriority = 'High' | 'Medium' | 'Low'

export type PilotWorkspaceAction = {
  id: string
  label: string
  reason: string
  status: ReadinessState
  priority: ActionPriority
  href: string
}

const money = (value: unknown) => Number(value ?? 0)
const annualize = (monthly: unknown) => money(monthly) * 12
const statusText = (value: unknown) => String(value ?? '').toUpperCase()
const isReadyText = (value: unknown) => /READY|PASSED|COMPLETE|COMPLETED|HIGH|TRUSTED|HEALTHY/.test(statusText(value))
const isBlockedText = (value: unknown) => /BLOCK|FAILED|UNAVAILABLE|LOW_CONFIDENCE/.test(statusText(value))
const latestDate = (...values: unknown[]) => values.map((value) => String(value ?? '')).filter(Boolean).sort().at(-1) ?? new Date().toISOString()

function readinessFromCount(blocked: number, needsAttention: number): ReadinessState {
  if (blocked > 0) return 'Blocked'
  if (needsAttention > 0) return 'Needs attention'
  return 'Ready'
}

function action(id: string, label: string, reason: string, status: ReadinessState, priority: ActionPriority, href: string): PilotWorkspaceAction {
  return { id, label, reason, status, priority, href }
}

export function buildPilotWorkspaceData(sources: any) {
  const workspace = sources.workspace ?? {}
  const runtime = sources.runtime ?? {}
  const onboarding = sources.onboarding?.onboarding ?? {}
  const checklist = sources.onboarding?.checklist ?? {}
  const connectors = Array.isArray(sources.connectors?.data) ? sources.connectors.data : []
  const trustData = sources.trust?.data ?? {}
  const trustSummary = trustData.summary ?? {}
  const recommendations = Array.isArray(sources.recommendations?.data) ? sources.recommendations.data : []
  const outcomes = sources.outcomes?.data ?? {}
  const execution = sources.execution?.data ?? {}
  const evidence = sources.evidence?.data ?? {}
  const executive = sources.executive ?? {}
  const executiveSummary = executive.summary ?? {}
  const executiveMetrics = executiveSummary.valueMetrics ?? {}
  const executiveConfidence = executiveSummary.confidence ?? {}
  const executiveNarrative = executiveSummary.narrative ?? {}

  const connectorBlocked = connectors.filter((connector: any) => isBlockedText(connector.health ?? connector.status)).length
  const connectorNeedsAttention = connectors.filter((connector: any) => !isReadyText(connector.health ?? connector.status)).length
  const connectorStatus = connectors.length === 0 ? 'Needs attention' : readinessFromCount(connectorBlocked, connectorNeedsAttention)
  const trustStatus: ReadinessState = isBlockedText(trustSummary.globalTrustBand) ? 'Blocked' : isReadyText(trustSummary.globalTrustBand) ? 'Ready' : 'Review required'
  const onboardingStatus: ReadinessState = isBlockedText(onboarding.status) ? 'Blocked' : isReadyText(onboarding.status) ? 'Ready' : 'Needs attention'
  const evidencePacks = Array.isArray(evidence.packs) ? evidence.packs : []
  const completeEvidence = evidencePacks.filter((pack: any) => isReadyText(pack.status)).length
  const evidenceStatus: ReadinessState = completeEvidence > 0 ? 'Evidence ready' : 'Needs attention'
  const executiveStatus: ReadinessState = money(executiveMetrics.verifiedAnnualSavings) > 0 || money(executiveMetrics.projectedAnnualSavings) > 0 ? 'Ready' : 'Review required'

  const projectedAnnualValue = money(executiveMetrics.projectedAnnualSavings) || annualize(outcomes.proofSummary?.projectedMonthlySavings) || annualize(onboarding.opportunityAssessment?.projectedMonthlySavings) || annualize(recommendations.reduce((sum: number, item: any) => sum + money(item.saving ?? item.projectedMonthlySavings), 0))
  const verifiedAnnualValue = money(executiveMetrics.verifiedAnnualSavings) || annualize(outcomes.proofSummary?.verifiedMonthlySavings) || annualize(Array.isArray(outcomes.stats) ? outcomes.stats[1] : 0) || annualize(evidence.summary?.verifiedSavings)
  const pendingApprovals = (Array.isArray(execution.awaiting) ? execution.awaiting : []).filter((item: any) => /APPROVAL|PENDING/.test(statusText(item.status ?? item.readiness))).length
  const blockedActions = (Array.isArray(execution.awaiting) ? execution.awaiting : []).filter((item: any) => isBlockedText(item.status ?? item.readiness)).length + recommendations.filter((item: any) => isBlockedText(item.verdict)).length
  const dryRunReady = statusText(onboarding.pilotMode).includes('DRY_RUN') || (Array.isArray(execution.awaiting) ? execution.awaiting : []).some((item: any) => /DRY/.test(statusText(item.status ?? item.readiness)))
  const controlledExecutionReady = statusText(onboarding.pilotMode).includes('CONTROLLED') || (Array.isArray(execution.awaiting) ? execution.awaiting : []).some((item: any) => /EXECUTION/.test(statusText(item.status ?? item.readiness)))
  const verificationPending = money(outcomes.proofSummary?.verificationBacklogCount ?? (Array.isArray(outcomes.stats) ? outcomes.stats[3] : 0))
  const reviewRequired = recommendations.filter((item: any) => /APPROVAL|PENDING|REVIEW/.test(statusText(item.verdict ?? item.status))).length + pendingApprovals + verificationPending

  const openActions: PilotWorkspaceAction[] = []
  if (!isReadyText(onboarding.status)) openActions.push(action('connect-tenant', 'Connect tenant', 'Tenant setup is not ready for the pilot workspace.', onboardingStatus, 'High', '/onboarding/m365'))
  if (connectors.length === 0 || connectorStatus !== 'Ready') openActions.push(action('validate-permissions', 'Validate permissions', connectors.length === 0 ? 'No connector status is available yet.' : `${connectorNeedsAttention} connector item needs attention.`, connectorStatus, connectorStatus === 'Blocked' ? 'High' : 'Medium', '/connectors'))
  if (!isReadyText(onboarding.discovery?.status)) openActions.push(action('run-discovery', 'Run discovery', 'Discovery evidence is not complete.', 'Needs attention', 'High', '/onboarding/m365'))
  if (trustStatus !== 'Ready') openActions.push(action('review-trust-blockers', 'Review trust blockers', trustSummary.globalTrustLabel ?? 'Trust review is required before the next pilot step.', trustStatus, 'High', '/data-trust'))
  if (pendingApprovals > 0 || recommendations.some((item: any) => /APPROVAL/.test(statusText(item.verdict)))) openActions.push(action('approve-dry-runs', 'Approve dry runs', `${pendingApprovals || recommendations.filter((item: any) => /APPROVAL/.test(statusText(item.verdict))).length} item(s) need approval.`, 'Review required', 'High', '/approval-workflows'))
  if (controlledExecutionReady && blockedActions === 0) openActions.push(action('execute-controlled-actions', 'Execute controlled actions', 'Controlled actions are ready for the next execution window.', 'Ready', 'Medium', '/all/execution'))
  if (evidencePacks.length === 0 || evidenceStatus !== 'Evidence ready') openActions.push(action('generate-evidence-pack', 'Generate evidence pack', 'Pilot proof is not packaged for customer review.', evidenceStatus, 'Medium', '/evidence-packs'))
  if (executiveStatus !== 'Ready' || verificationPending > 0) openActions.push(action('prepare-executive-review', 'Prepare executive review', verificationPending > 0 ? `${verificationPending} outcome(s) still need verification.` : 'Executive value summary needs review.', 'Review required', 'Medium', '/executive-value'))
  if (openActions.length === 0) openActions.push(action('prepare-executive-review', 'Prepare executive review', 'Pilot workspace is ready for the daily customer-success review.', 'Ready', 'Low', '/executive-value'))

  const overallReadiness = readinessFromCount([onboardingStatus, connectorStatus, trustStatus].filter((status) => status === 'Blocked').length, [onboardingStatus, connectorStatus, trustStatus, evidenceStatus, executiveStatus].filter((status) => status !== 'Ready' && status !== 'Evidence ready').length)

  return {
    tenant: { name: workspace.tenantName ?? 'Demo workspace', environment: runtime.environment ?? workspace.mode ?? 'DEMO', lastUpdated: latestDate(onboarding.updatedAt, checklist.generatedAt, executiveSummary.generatedAt, evidencePacks[0]?.generatedAt, runtime.selectedAt) },
    overallReadiness,
    kpis: { tenantStatus: onboardingStatus, trustStatus, projectedAnnualValue, verifiedAnnualValue, openActions: openActions.length, evidencePacks: evidencePacks.length },
    pilotReadiness: [
      { label: 'Onboarding', status: onboardingStatus, detail: onboarding.status ?? 'Not started', href: '/onboarding/m365' },
      { label: 'Connector', status: connectorStatus, detail: connectors.length ? `${connectors.filter((connector: any) => isReadyText(connector.health ?? connector.status)).length}/${connectors.length} ready` : 'No connector data yet', href: '/connectors' },
      { label: 'Trust', status: trustStatus, detail: trustSummary.globalTrustLabel ?? trustSummary.globalTrustBand ?? 'Trust unavailable', href: '/data-trust' },
      { label: 'Evidence', status: evidenceStatus, detail: evidencePacks.length ? `${completeEvidence}/${evidencePacks.length} evidence pack(s) ready` : 'Evidence pack not generated', href: '/evidence-packs' },
      { label: 'Executive review', status: executiveStatus, detail: executiveNarrative.headline ?? 'Executive value review pending', href: '/executive-value' },
    ],
    valueSummary: { projectedAnnualValue, verifiedAnnualValue, confidence: executiveConfidence.outcomeConfidenceBand ?? outcomes.proofSummary?.averageConfidenceBand ?? 'Review required', narrative: executiveNarrative.executiveSummary ?? executiveNarrative.valueRealizationSummary ?? 'Value identified from current recommendations, execution outcomes, and evidence packs.' },
    executionControl: { pendingApprovals, dryRunStatus: dryRunReady ? 'Ready' : 'Needs attention', controlledExecutionStatus: controlledExecutionReady ? 'Ready' : 'Review required', blockedActions, verificationStatus: verificationPending > 0 ? 'Review required' : verifiedAnnualValue > 0 ? 'Value verified' : 'Needs attention' },
    evidenceProof: { packs: evidencePacks.slice(0, 3), proofStatus: evidenceStatus, exportAvailability: evidencePacks.length ? 'Export available' : 'Generate evidence pack', executiveReviewReadiness: executiveStatus },
    openActions,
    loading: Boolean(sources.onboarding?.loading || sources.connectors?.loading || sources.trust?.loading || sources.recommendations?.loading || sources.outcomes?.loading || sources.execution?.loading || sources.evidence?.loading || sources.executive?.loading),
    sourceWarnings: [sources.onboarding?.error, sources.connectors?.error, sources.trust?.error, sources.recommendations?.error, sources.outcomes?.error, sources.execution?.error, sources.evidence?.error, sources.executive?.error].filter(Boolean).map((error: any) => error.message ?? String(error)),
  }
}

export function usePilotWorkspaceData() {
  const workspace = useWorkspace()
  const runtime = useRuntimeContext()
  const onboarding = useM365OnboardingData()
  const connectors = useConnectorHubData()
  const trust = useDataTrustData()
  const recommendations = useRecommendationsData()
  const outcomes = useOutcomesData()
  const execution = useExecutionData()
  const evidence = useEvidencePacks()
  const executive = useExecutiveValueData()

  return useMemo(() => buildPilotWorkspaceData({ workspace, runtime, onboarding, connectors, trust, recommendations, outcomes, execution, evidence, executive }), [workspace, runtime, onboarding, connectors, trust, recommendations, outcomes, execution, evidence, executive])
}
