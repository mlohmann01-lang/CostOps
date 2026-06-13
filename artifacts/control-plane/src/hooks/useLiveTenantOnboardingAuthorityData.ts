import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingStage =
  | 'DISCOVER' | 'CONNECT' | 'VALIDATE' | 'TRUST' | 'READINESS'
  | 'CERTIFY' | 'EXECUTE' | 'VERIFY' | 'PROTECT' | 'PROVE'

export type OnboardingStageStatus = {
  stage: OnboardingStage
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE'
  score: number
  completed: boolean
  completedAt?: string
  requiredActions: string[]
  blockers: string[]
  evidenceIds: string[]
}

export type OnboardingBlocker = {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  stage: OnboardingStage
  title: string
  description: string
  resolutionAction: string
  resolved: boolean
}

export type TenantOnboardingAuthority = {
  id: string
  tenantId: string
  currentStage: OnboardingStage
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'READY_FOR_PILOT' | 'READY_FOR_PRODUCTION' | 'COMPLETE'
  progressPercent: number
  stages: OnboardingStageStatus[]
  readinessScore: number
  trustScore: number
  blockers: OnboardingBlocker[]
  generatedAt: string
  updatedAt: string
}

export type TenantNextAction = {
  priority: number
  title: string
  description: string
  stage: OnboardingStage
  actionType: 'CONNECTOR' | 'TRUST' | 'READINESS' | 'CERTIFICATION' | 'EXECUTION' | 'VERIFICATION' | 'PROTECTION' | 'PROOF'
  blockedValue?: number
  link?: string
}

export type FirstOutcomeReadiness = {
  ready: boolean
  firstExecutableActions: string[]
  projectedValue: number
  requiredApprovals: string[]
  trustIssues: string[]
  readinessIssues: string[]
}

export type OnboardingAuthoritySummary = {
  tenantsReadyForPilot: number
  tenantsReadyForProduction: number
  blockedTenants: number
  averageReadinessScore: number
  averageTrustScore: number
  averageProgressPercent: number
  commonBlockers: string[]
  firstOutcomeReadyTenants: number
}

// ─── API paths ────────────────────────────────────────────────────────────────

export const liveTenantOnboardingAuthorityApiPaths = [
  '/api/onboarding/authority',
  '/api/onboarding/next-actions',
  '/api/onboarding/first-outcome',
  '/api/onboarding/readiness',
]

// ─── Demo Data ────────────────────────────────────────────────────────────────

function demoStage(stage: OnboardingStage, completed: boolean, score: number): OnboardingStageStatus {
  return {
    stage,
    status: completed ? 'COMPLETE' : score > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    score: completed ? 100 : score,
    completed,
    completedAt: completed ? '2025-01-15T10:00:00Z' : undefined,
    requiredActions: completed ? [] : [`Complete ${stage.toLowerCase()} requirements`],
    blockers: [],
    evidenceIds: [],
  }
}

export const demoOnboardingAuthority: TenantOnboardingAuthority = {
  id: 'demo-onboarding-authority',
  tenantId: 'demo-tenant',
  currentStage: 'CERTIFY',
  overallStatus: 'IN_PROGRESS',
  progressPercent: 50,
  stages: [
    demoStage('DISCOVER', true, 100),
    demoStage('CONNECT', true, 100),
    demoStage('VALIDATE', true, 100),
    demoStage('TRUST', true, 100),
    demoStage('READINESS', true, 100),
    demoStage('CERTIFY', false, 60),
    demoStage('EXECUTE', false, 0),
    demoStage('VERIFY', false, 0),
    demoStage('PROTECT', false, 0),
    demoStage('PROVE', false, 0),
  ],
  readinessScore: 72,
  trustScore: 85,
  blockers: [
    {
      id: 'blocker-1',
      severity: 'HIGH',
      stage: 'CERTIFY',
      title: 'No certified wedges',
      description: 'At least one wedge must be certified for controlled execution.',
      resolutionAction: 'Complete wedge certification through the Certified Wedge Registry.',
      resolved: false,
    },
  ],
  generatedAt: '2025-06-13T12:00:00Z',
  updatedAt: '2025-06-13T12:00:00Z',
}

export const demoNextActions: TenantNextAction[] = [
  { priority: 1, title: 'Complete wedge certification', description: 'Complete wedge certification through the Certified Wedge Registry.', stage: 'CERTIFY', actionType: 'CERTIFICATION', link: '/certified-wedges' },
  { priority: 2, title: 'Run first governed execution', description: 'Execute a governed action from the Action Center.', stage: 'EXECUTE', actionType: 'EXECUTION', link: '/actions' },
  { priority: 3, title: 'Verify economic outcomes', description: 'Run outcome verification for a completed execution.', stage: 'VERIFY', actionType: 'VERIFICATION', link: '/actions' },
  { priority: 4, title: 'Enable outcome protection', description: 'Enable outcome protection for a verified outcome.', stage: 'PROTECT', actionType: 'PROTECTION', link: '/outcome-protection' },
  { priority: 5, title: 'Generate executive proof pack', description: 'Generate a Board Pack or CFO Pack from the Executive Proof Pack Authority.', stage: 'PROVE', actionType: 'PROOF', link: '/executive-proof-pack-authority' },
]

export const demoFirstOutcome: FirstOutcomeReadiness = {
  ready: false,
  firstExecutableActions: [],
  projectedValue: 480000,
  requiredApprovals: [],
  trustIssues: [],
  readinessIssues: ['No certified wedges available for execution'],
}

export const demoOnboardingSummary: OnboardingAuthoritySummary = {
  tenantsReadyForPilot: 1,
  tenantsReadyForProduction: 0,
  blockedTenants: 0,
  averageReadinessScore: 72,
  averageTrustScore: 85,
  averageProgressPercent: 50,
  commonBlockers: ['No certified wedges'],
  firstOutcomeReadyTenants: 0,
}

// ─── Hook State ───────────────────────────────────────────────────────────────

type LiveTenantOnboardingAuthorityData = {
  authority: TenantOnboardingAuthority
  nextActions: TenantNextAction[]
  firstOutcome: FirstOutcomeReadiness
  summary: OnboardingAuthoritySummary
  isDemo: boolean
  loading: boolean
  error: string | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveTenantOnboardingAuthorityData(): LiveTenantOnboardingAuthorityData & { triggerEvaluate: () => Promise<void> } {
  const [state, setState] = useState<LiveTenantOnboardingAuthorityData>({
    authority: demoOnboardingAuthority,
    nextActions: demoNextActions,
    firstOutcome: demoFirstOutcome,
    summary: demoOnboardingSummary,
    isDemo: true,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/onboarding/authority').then((r) => r.json()),
      fetch('/api/onboarding/next-actions').then((r) => r.json()),
      fetch('/api/onboarding/first-outcome').then((r) => r.json()),
      fetch('/api/onboarding/readiness').then((r) => r.json()),
    ])
      .then(([authority, nextActions, firstOutcome, summary]) => {
        if (!cancelled) setState({ authority, nextActions, firstOutcome, summary, isDemo: false, loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState((prev) => ({ ...prev, isDemo: true, loading: false, error: String(err) }))
      })
    return () => { cancelled = true }
  }, [])

  async function triggerEvaluate() {
    try {
      await fetch('/api/onboarding/evaluate', { method: 'POST' })
    } catch { /* ignore */ }
  }

  return { ...state, triggerEvaluate }
}
