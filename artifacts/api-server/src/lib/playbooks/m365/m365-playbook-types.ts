import type { RawOpportunity } from '../../opportunity-factory/opportunity-normalizer'

export type M365ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW'
export type M365EntityType = 'USER' | 'LICENSE_POOL' | 'COPILOT_USER' | 'MAILBOX' | 'LICENSE_ASSIGNMENT' | 'GROUP' | 'SKU'

export interface M365OpportunityCandidate {
  playbookId: string
  entityId: string
  entityType: M365EntityType
  projectedMonthlySavings: number
  projectedAnnualSavings: number
  confidenceBand: M365ConfidenceBand
  evidence: string[]
  blockers: string[]
  trustRequirements: string[]
  opportunityPayload: RawOpportunity
}

export interface M365Playbook {
  playbookId: string
  evaluate(tenantId: string, snapshotId: string): Promise<M365OpportunityCandidate[]>
}

export interface M365PlaybookResult {
  tenantId: string
  snapshotId: string
  playbookId: string
  candidates: M365OpportunityCandidate[]
  projectedMonthlySavings: number
  projectedAnnualSavings: number
  confidence: M365ConfidenceBand
  evidenceCount: number
  errors: string[]
}

export interface M365PlaybookRunSummary {
  tenantId: string
  snapshotId: string
  playbooksRun: number
  candidates: number
  projectedMonthlySavings: number
  projectedAnnualSavings: number
  confidence: M365ConfidenceBand
  evidenceCount: number
  errors: string[]
  opportunitiesGenerated: number
  completedAt: string
}
