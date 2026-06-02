export type ExecutiveValueConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
export type ExecutiveValueBlockerType = 'TRUST' | 'APPROVAL' | 'CONNECTOR' | 'EVIDENCE' | 'EXECUTION' | 'DRIFT'
export type ExecutiveValueMetricSource = 'OUTCOME_PROOF' | 'OPPORTUNITY_FALLBACK' | 'APPROVAL_AUTHORITY' | 'UNAVAILABLE'

export interface ExecutiveValueMetrics {
  projectedMonthlySavings: number
  approvedMonthlySavings: number
  executedMonthlySavings: number
  verifiedMonthlySavings: number
  retainedMonthlySavings: number
  protectedMonthlySavings: number
  projectedAnnualSavings: number
  approvedAnnualSavings: number
  executedAnnualSavings: number
  verifiedAnnualSavings: number
  retainedAnnualSavings: number
  protectedAnnualSavings: number
}

export interface ExecutiveValueMetricSourceDetail { source: ExecutiveValueMetricSource; reason: string }
export type ExecutiveValueMetricSources = Record<keyof ExecutiveValueMetrics, ExecutiveValueMetricSourceDetail>

export interface ExecutiveValueSummary {
  tenantId: string
  generatedAt: string
  valueMetrics: ExecutiveValueMetrics
  metricSources: ExecutiveValueMetricSources
  conversionRates: {
    approvedVsProjectedPercent: number
    executedVsApprovedPercent: number
    verifiedVsExecutedPercent: number
    retainedVsVerifiedPercent: number
    protectedVsVerifiedPercent: number
  }
  confidence: {
    evidenceCompletenessPercent: number
    outcomeConfidenceBand: ExecutiveValueConfidenceBand
    trustCoveragePercent: number
    connectorCoveragePercent: number
    executionCoveragePercent: number
  }
  counts: {
    openOpportunities: number
    priorityOpportunities: number
    approvalsPending: number
    executionsCompleted: number
    outcomesVerified: number
    driftAlertsOpen: number
    evidencePacksGenerated: number
  }
  byDomain: Array<{ domain: string; projectedMonthlySavings: number; verifiedMonthlySavings: number; protectedMonthlySavings: number; confidenceBand: ExecutiveValueConfidenceBand }>
  topValueDrivers: Array<{ id: string; title: string; source: string; domain: string; projectedMonthlySavings: number; verifiedMonthlySavings: number; status: string; evidencePackId?: string }>
  blockers: Array<{ id: string; title: string; type: ExecutiveValueBlockerType; blockedValue: number; reason: string; recommendedAction: string }>
  narrative: ExecutiveValueNarrative
}

export interface ExecutiveValueNarrative {
  headline: string
  executiveSummary: string
  valueRealizationSummary: string
  confidenceSummary: string
  riskSummary: string
  nextBestActions: string[]
}

export type ExecutiveValueAggregate = Omit<ExecutiveValueSummary, 'narrative'>
