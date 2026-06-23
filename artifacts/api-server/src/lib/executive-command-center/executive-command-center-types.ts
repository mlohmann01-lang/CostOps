// Program EX1 — Executive Value Command Center. Capability 1: canonical
// executive aggregation model. Joins X1-X4's Technology Investment,
// Technology Economics, Technology Capital Allocation, the Technology
// Portfolio Authority, AI Economics and AI Capital Allocation, and the
// Executive Proof Pack Authority — never recomputes any underlying metric.

export interface ExecutiveValueSummary {
  tenantId: string;
  totalTechnologyAssets: number;
  totalSpendKnown: number;
  totalValueKnown: number;
  economicsCoverage: number;
  recommendationCoverage: number;
  ownershipCoverage: number;
  graphCoverage: number;
  upcomingRenewals: number;
  generatedAt: string;
}

export type ExecutiveCommandCenterReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface ExecutiveDashboard {
  tenantId: string;
  portfolio: {
    totalAssets: number;
    totalVendors: number;
    totalContracts: number;
    totalRenewals: number;
  };
  economics: {
    knownSpend: number;
    knownValue: number;
    roiCoverage: number;
    economicsReadiness: 'READY' | 'PARTIAL' | 'NOT_READY';
  };
  recommendations: {
    totalTechnologies: number;
    expandCount: number;
    keepCount: number;
    optimiseCount: number;
    consolidateCount: number;
    renewCount: number;
    retireCount: number;
    reviewCount: number;
  };
  risk: {
    unknownOwnershipCount: number;
    unknownEconomicsCount: number;
    unknownRenewalsCount: number;
    missingEvidenceCount: number;
  };
  generatedAt: string;
}

export interface ExecutiveInvestmentRow {
  assetId: string;
  assetName: string;
  recommendation: string;
  confidence: string;
  spend?: number;
  value?: number;
  readiness: string;
  rationale: string[];
}

export interface ExecutiveRiskView {
  tenantId: string;
  missingOwnership: Array<{ assetId: string; assetName: string }>;
  missingCapabilityMapping: Array<{ assetId: string; assetName: string }>;
  missingEconomics: Array<{ assetId: string; assetName: string }>;
  missingRenewals: Array<{ assetId: string; assetName: string }>;
  missingEvidence: Array<{ assetId: string; assetName: string }>;
  graphGaps: Array<{ id: string; severity: string; area: string; description: string }>;
  generatedAt: string;
}

export interface ExecutiveCommandCenterAuthorityResult {
  authority: 'EXECUTIVE_COMMAND_CENTER_AUTHORITY';
  tenantId: string;
  verdict: ExecutiveCommandCenterReadiness;
  score: number;
  economicsCoverage: { ratio: number };
  recommendationCoverage: { ratio: number };
  ownershipCoverage: { ratio: number };
  graphCoverage: { ratio: number };
  reasoning: string;
}
