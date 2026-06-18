import { useMemo } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { useTenantReadinessData } from './useTenantReadinessData'
import { useActionCenterData } from './useActionCenterData'
import { useOutcomeProofData } from './useOutcomeProofData'

export type JourneyStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
export type JourneyStep = { id: string; label: string; status: JourneyStepStatus; href: string }

export type FirstOutcomeJourneyData = {
  dataState: 'LIVE' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'
  steps: JourneyStep[]
  achieved: boolean
  achievedDetail?: { recommendationId: string; actionTitle: string; verifiedSavings: number; executedAt?: string }
  loading: boolean
}

const EXECUTED_OR_LATER = ['EXECUTED', 'VERIFYING', 'VERIFIED', 'RETAINED']
const VERIFIED_OR_LATER = ['VERIFIED', 'RETAINED']
const APPROVED_OR_LATER = ['APPROVED', 'QUEUED', 'EXECUTING', 'EXECUTED', 'VERIFYING', 'VERIFIED', 'RETAINED']

export function useFirstOutcomeJourney(): FirstOutcomeJourneyData {
  const workspace = useWorkspace()
  const readiness = useTenantReadinessData()
  const actionCenter = useActionCenterData()
  const outcomes = useOutcomeProofData()

  return useMemo(() => {
    const actions = actionCenter.actions ?? []
    const hasAction = actions.length > 0
    const approvedOrLater = actions.some((a: any) => APPROVED_OR_LATER.includes(a.status))
    const executedOrLater = actions.some((a: any) => EXECUTED_OR_LATER.includes(a.status))
    const verifiedAction = actions.find((a: any) => VERIFIED_OR_LATER.includes(a.status))
    const ledgerHasEntry = Array.isArray(outcomes.data?.ledger) && outcomes.data.ledger.length > 0

    const steps: JourneyStep[] = [
      { id: 'connect', label: 'Connect M365', href: '/connectors', status: readiness.connectorStatus === 'CONNECTED' ? 'COMPLETE' : readiness.connectorStatus === 'ERROR' ? 'IN_PROGRESS' : 'NOT_STARTED' },
      { id: 'discover', label: 'Run Discovery', href: '/tenant-readiness', status: readiness.discoveryStatus === 'COMPLETE' ? 'COMPLETE' : readiness.discoveryStatus === 'RUNNING' ? 'IN_PROGRESS' : 'NOT_STARTED' },
      { id: 'review', label: 'Review Recommendations', href: '/actions', status: readiness.recommendationStatus === 'GENERATED' ? 'COMPLETE' : 'NOT_STARTED' },
      { id: 'select', label: 'Select Action', href: '/actions', status: hasAction ? 'COMPLETE' : 'NOT_STARTED' },
      { id: 'approve', label: 'Approve', href: '/approvals', status: approvedOrLater ? 'COMPLETE' : hasAction ? 'IN_PROGRESS' : 'NOT_STARTED' },
      { id: 'execute', label: 'Execute', href: '/actions', status: executedOrLater ? 'COMPLETE' : approvedOrLater ? 'IN_PROGRESS' : 'NOT_STARTED' },
      { id: 'verify', label: 'Verify', href: '/actions', status: verifiedAction ? 'COMPLETE' : executedOrLater ? 'IN_PROGRESS' : 'NOT_STARTED' },
      { id: 'outcome', label: 'View Outcome', href: '/outcomes', status: ledgerHasEntry ? 'COMPLETE' : verifiedAction ? 'IN_PROGRESS' : 'NOT_STARTED' },
    ]

    const achieved = ledgerHasEntry && Boolean(verifiedAction)
    const achievedDetail = achieved && verifiedAction ? {
      recommendationId: verifiedAction.recommendationIds?.[0] ?? '—',
      actionTitle: verifiedAction.title,
      verifiedSavings: verifiedAction.actualAnnualValue ?? verifiedAction.actualMonthlyValue ?? 0,
      executedAt: verifiedAction.updatedAt,
    } : undefined

    const dataState: FirstOutcomeJourneyData['dataState'] = workspace.mode === 'demo' ? 'DEMO' : !workspace.dataReady ? 'NOT_CONNECTED' : actionCenter.dataState === 'NO_DATA' && !hasAction ? 'NO_DATA' : 'LIVE'

    return { dataState, steps, achieved, achievedDetail, loading: readiness.loading || actionCenter.loading || outcomes.loading }
  }, [workspace.mode, workspace.dataReady, readiness, actionCenter, outcomes])
}
