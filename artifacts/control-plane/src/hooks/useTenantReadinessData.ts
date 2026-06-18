import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'

export type ConnectorStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR'
export type DiscoveryStatus = 'NOT_STARTED' | 'RUNNING' | 'COMPLETE'
export type TrustStatus = 'READY' | 'WARNING' | 'BLOCKED'
export type RecommendationStatus = 'NONE' | 'GENERATED'
export type ExecutionReadiness = 'READY' | 'BLOCKED'
export type TenantReadinessDataState = 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export type NextAction = { id: string; label: string; priority: number; status: string; href: string }

export type TenantReadinessData = {
  dataState: TenantReadinessDataState
  connectorStatus: ConnectorStatus
  discoveryStatus: DiscoveryStatus
  trustStatus: TrustStatus
  recommendationStatus: RecommendationStatus
  executionReadiness: ExecutionReadiness
  firstOutcomeReadinessPercent: number
  requiredActions: string[]
  nextActions: NextAction[]
  loading: boolean
  error?: string
  refresh(): Promise<void>
}

export const tenantReadinessApiPaths = ['/api/onboarding/m365', '/api/runtime/connector-health'] as const

const STEP_HREFS: Record<string, string> = {
  WORKSPACE_SETUP: '/workspace',
  CONNECT_M365: '/connectors',
  READINESS_CHECK: '/connectors',
  DISCOVERY: '/connectors',
  TRUST_ASSESSMENT: '/connectors',
  OPPORTUNITY_ASSESSMENT: '/actions',
  PILOT_MODE: '/connectors',
  GO_LIVE_CHECKLIST: '/live-tenant-readiness',
  COMPLETE: '/outcomes',
}

function stepState(steps: Array<{ stepId: string; state: string }> = [], stepId: string) {
  return steps.find((step) => step.stepId === stepId)?.state ?? 'NOT_STARTED'
}

function mapDiscoveryStatus(state: string): DiscoveryStatus {
  if (state === 'IN_PROGRESS') return 'RUNNING'
  if (['PASSED', 'WARNING', 'BLOCKED', 'SKIPPED'].includes(state)) return 'COMPLETE'
  return 'NOT_STARTED'
}

function mapTrustStatus(state: string): TrustStatus {
  if (state === 'BLOCKED') return 'BLOCKED'
  if (['PASSED'].includes(state)) return 'READY'
  return 'WARNING'
}

export const demoTenantReadinessOnboarding = {
  currentStep: 'OPPORTUNITY_ASSESSMENT',
  status: 'IN_PROGRESS',
  blockers: [] as string[],
  steps: [
    { stepId: 'WORKSPACE_SETUP', label: 'Workspace Setup', state: 'PASSED' },
    { stepId: 'CONNECT_M365', label: 'Connect M365', state: 'PASSED' },
    { stepId: 'READINESS_CHECK', label: 'Readiness Check', state: 'PASSED' },
    { stepId: 'DISCOVERY', label: 'Discovery', state: 'PASSED' },
    { stepId: 'TRUST_ASSESSMENT', label: 'Trust Assessment', state: 'PASSED' },
    { stepId: 'OPPORTUNITY_ASSESSMENT', label: 'Opportunity Assessment', state: 'PASSED' },
    { stepId: 'PILOT_MODE', label: 'Pilot Mode', state: 'WARNING' },
    { stepId: 'GO_LIVE_CHECKLIST', label: 'Go-Live Checklist', state: 'NOT_STARTED' },
    { stepId: 'COMPLETE', label: 'Complete', state: 'NOT_STARTED' },
  ],
  opportunityAssessment: { opportunitiesGenerated: 6, readyForApproval: 3 },
}

export const demoTenantConnectorHealth = [
  { connectorId: 'm365-demo', connectorType: 'M365', status: 'HEALTHY' },
]

function buildReadiness(onboarding: any, connectorHealth: any[], dataState: TenantReadinessDataState): Omit<TenantReadinessData, 'loading' | 'error' | 'refresh'> {
  const steps = Array.isArray(onboarding?.steps) ? onboarding.steps : []
  const connected = Array.isArray(connectorHealth) && connectorHealth.some((c) => String(c.status).toUpperCase() === 'HEALTHY')
  const erroring = Array.isArray(connectorHealth) && connectorHealth.length > 0 && !connected
  const connectorStatus: ConnectorStatus = connected ? 'CONNECTED' : erroring ? 'ERROR' : 'NOT_CONNECTED'
  const discoveryStatus = mapDiscoveryStatus(stepState(steps, 'DISCOVERY'))
  const trustStatus = mapTrustStatus(stepState(steps, 'TRUST_ASSESSMENT'))
  const opportunityAssessment = onboarding?.opportunityAssessment
  const recommendationStatus: RecommendationStatus = (opportunityAssessment?.opportunitiesGenerated ?? 0) > 0 ? 'GENERATED' : 'NONE'
  const goLiveState = stepState(steps, 'GO_LIVE_CHECKLIST')
  const executionReadiness: ExecutionReadiness = ['PASSED', 'WARNING'].includes(goLiveState) ? 'READY' : 'BLOCKED'
  const completed = steps.filter((step: any) => ['PASSED', 'WARNING', 'SKIPPED'].includes(step.state)).length
  const firstOutcomeReadinessPercent = steps.length ? Math.round((completed / steps.length) * 100) : 0
  const requiredActions: string[] = Array.isArray(onboarding?.blockers) ? onboarding.blockers : []
  const nextActions: NextAction[] = steps
    .filter((step: any) => !['PASSED', 'SKIPPED'].includes(step.state))
    .map((step: any, index: number) => ({ id: step.stepId, label: step.label, priority: index + 1, status: step.state, href: STEP_HREFS[step.stepId] ?? '/connectors' }))
  return { dataState, connectorStatus, discoveryStatus, trustStatus, recommendationStatus, executionReadiness, firstOutcomeReadinessPercent, requiredActions, nextActions }
}

export function useTenantReadinessData(): TenantReadinessData {
  const workspace = useWorkspace()
  const [snapshot, setSnapshot] = useState(() => buildReadiness(demoTenantReadinessOnboarding, demoTenantConnectorHealth, 'DEMO'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const refresh = useCallback(async () => {
    if (workspace.mode === 'demo') {
      setSnapshot(buildReadiness(demoTenantReadinessOnboarding, demoTenantConnectorHealth, 'DEMO'))
      setError(undefined)
      return
    }
    if (!workspace.dataReady) {
      setSnapshot(buildReadiness({ steps: [], blockers: [] }, [], 'NOT_CONNECTED'))
      setError(undefined)
      return
    }
    setLoading(true)
    try {
      const [onboarding, connectorHealth] = await Promise.all([
        liveFetch<any>('/api/onboarding/m365'),
        liveFetch<any[]>('/api/runtime/connector-health'),
      ])
      const steps = Array.isArray(onboarding?.steps) ? onboarding.steps : []
      const hasData = steps.some((step: any) => step.state !== 'NOT_STARTED')
      setSnapshot(buildReadiness(onboarding, connectorHealth, hasData ? 'LIVE' : 'NO_DATA'))
      setError(undefined)
    } catch (err) {
      const normalized = normalizeApiError(err)
      setSnapshot(buildReadiness({ steps: [], blockers: [] }, [], 'NO_DATA'))
      setError(normalized.message)
    } finally {
      setLoading(false)
    }
  }, [workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])

  return { ...snapshot, loading, error, refresh }
}
