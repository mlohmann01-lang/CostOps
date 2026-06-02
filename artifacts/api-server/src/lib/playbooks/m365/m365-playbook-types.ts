import type { RawOpportunity } from '../../opportunity-factory/opportunity-normalizer'
import type { M365SkuCostEstimate } from './m365-sku-cost-authority'
import type { M365EntitlementRelationship } from './m365-entitlement-matrix'
import type { EvidenceQuality, ExecutionSafety, FalsePositiveRisk, M365EconomicIntelligenceAssessment, ProductionReadiness, SavingsConfidence } from './m365-economic-intelligence-types'

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
  economicAssessment: M365EconomicIntelligenceAssessment
  executionSafety: ExecutionSafety
  productionReadiness: ProductionReadiness
  falsePositiveRisk: FalsePositiveRisk
  evidenceQuality: EvidenceQuality
  savingsConfidence: SavingsConfidence
  costEstimates?: M365SkuCostEstimate[]
  entitlementRelationships?: M365EntitlementRelationship[]
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
  productionReadinessCounts: { readyForApproval: number; needsHardening: number; notReady: number }
  completedAt: string
}
