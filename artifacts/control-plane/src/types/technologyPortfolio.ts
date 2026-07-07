export type PortfolioReadiness = 'READY' | 'PARTIAL' | 'MISSING_DATA' | 'BLOCKED' | 'DEMO'
export type TechnologyManagementDecision = 'KEEP' | 'RENEW' | 'OPTIMISE' | 'CONSOLIDATE' | 'RETIRE' | 'REVIEW' | 'BLOCKED'

export interface TechnologyPortfolioSnapshot {
  id: string
  tenantId: string
  generatedAt: string
  assetCount: number
  vendorCount: number
  productCount: number
  applicationCount: number
  totalAnnualSpend?: number
  totalFinanceVerifiedSavings?: number
  totalCommercialExposure?: number
  rationalisationOpportunity?: number
  annualisedSpendUnderReview?: number
  duplicateCapabilityCount?: number
  highRiskUnmanagedAssetCount?: number
  evidenceCompletenessRate?: number
  currency?: string
  missingOwnerCount: number
  missingCostCentreCount: number
  renewalRiskCount: number
  unverifiedSavingsCount: number
  averageConfidenceScore: number
  evidenceCoverageScore?: number
  evidenceGapCount?: number
  restrictedEvidenceCount?: number
  readiness: PortfolioReadiness
}

export interface TechnologyPortfolioAsset {
  id: string
  name: string
  assetType: string
  capability?: string
  vendorId?: string
  ownerUserId?: string
  ownerStatus?: 'ASSIGNED' | 'MISSING' | 'DISPUTED'
  businessUnit?: string
  costCentreId?: string
  annualSpend?: number
  utilisation?: number
  renewalDate?: string
  contractId?: string
  verifiedSavings?: number
  commercialExposure?: number
  completenessScore: number
  evidenceCompletenessStatus?: 'COMPLETE' | 'PARTIAL'
  managementDecision?: TechnologyManagementDecision
  decisionEvidence?: string[]
  lifecycleStatus: string
  currency?: string
}

export interface TechnologyPortfolioRiskRecord {
  id: string
  targetId: string
  riskType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  valueAtRisk?: number
  currency?: string
}

export interface TechnologyPortfolioRecommendation {
  id: string
  targetId: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  decision: TechnologyManagementDecision
  title: string
  description: string
  evidenceIds: string[]
  projectedValue?: number
  currency?: string
  status: string
}

export interface TechnologyPortfolioDuplicateCapability {
  id: string
  capability: string
  assetIds: string[]
  overlapReason: string
  annualSpend?: number
  recommendedDecision: TechnologyManagementDecision
  evidenceIds: string[]
}

export interface TechnologyPortfolioRenewal {
  id: string
  assetId: string
  vendor: string
  renewalDate: string
  annualSpend?: number
  renewalRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendedDecision: TechnologyManagementDecision
  evidenceIds: string[]
}

export interface TechnologyPortfolioSummary {
  snapshot?: TechnologyPortfolioSnapshot
  assets: TechnologyPortfolioAsset[]
  vendors: any[]
  products: any[]
  applications: any[]
  risks: TechnologyPortfolioRiskRecord[]
  recommendations: TechnologyPortfolioRecommendation[]
  duplicateCapabilities?: TechnologyPortfolioDuplicateCapability[]
  renewals?: TechnologyPortfolioRenewal[]
  values: any[]
  proofPackReadiness?: { boardPackStatus?: string; cfoPackStatus?: string; auditPackStatus?: string; evidenceExportSafety?: string }
  executionReadiness?: { planStatus?: string; dryRunStatus?: string; blockedExecutionCount?: number; readyExecutionCount?: number }
}
