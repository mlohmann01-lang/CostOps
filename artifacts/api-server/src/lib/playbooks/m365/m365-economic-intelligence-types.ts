export type SavingsConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
export type ExecutionSafety = 'SAFE_TO_RECOMMEND' | 'REVIEW_REQUIRED' | 'BLOCKED'
export type ProductionReadiness = 'READY_FOR_APPROVAL' | 'NEEDS_HARDENING' | 'NOT_READY'
export type FalsePositiveRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type EvidenceQuality = 'STRONG' | 'ADEQUATE' | 'WEAK' | 'INSUFFICIENT'
export type AllowedNextStep = 'SHOW_OPPORTUNITY' | 'SUBMIT_FOR_APPROVAL' | 'REVIEW_ONLY' | 'BLOCK'
export type M365TrustGateResult = 'PASSED' | 'FAILED' | 'PENDING_TRUST_GATE'

export interface M365EconomicIntelligenceAssessment {
  savingsConfidence: SavingsConfidence
  executionSafety: ExecutionSafety
  productionReadiness: ProductionReadiness
  falsePositiveRisk: FalsePositiveRisk
  evidenceQuality: EvidenceQuality
  savingsReasons: string[]
  safetyReasons: string[]
  evidenceReasons: string[]
  blockers: string[]
  requiredHumanReview: boolean
  allowedNextStep: AllowedNextStep
  trustGateResult?: M365TrustGateResult
  trustGateReasons?: string[]
}

export interface M365ProductionReadinessCounts {
  readyForApproval: number
  needsHardening: number
  notReady: number
}
