// Program X4 — Technology Capital Allocation Authority. Capability 1:
// canonical allocation model.
//
// Answers "where should the next technology dollar go?" by joining X3's
// technology economics, X1/X2's technology investment graph, and the
// Technology Portfolio Authority's real ownership/renewal data. Never
// fabricates value, economics, or recommendations — every decision must
// reference real evidence already produced upstream.

export type TechnologyAllocationDecision =
  | 'EXPAND' | 'KEEP' | 'OPTIMISE' | 'CONSOLIDATE' | 'RENEW' | 'RETIRE' | 'REVIEW';
export type TechnologyAllocationConfidence = 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';

export interface TechnologyCapitalAllocationRecommendation {
  id: string;
  tenantId: string;
  assetId: string;

  decision: TechnologyAllocationDecision;

  confidenceScore: number;
  confidenceLevel: TechnologyAllocationConfidence;

  rationale: string[];
  evidenceIds: string[];

  economicsReadiness: 'READY' | 'PARTIAL' | 'NOT_READY';

  generatedAt: string;
}

export interface TechnologyCapitalAllocationSummary {
  tenantId: string;
  totalTechnologies: number;
  expandCount: number;
  keepCount: number;
  optimiseCount: number;
  consolidateCount: number;
  renewCount: number;
  retireCount: number;
  reviewCount: number;
  averageConfidence: number;
  executiveSummary: string;
  generatedAt: string;
}

export interface TechnologyCapitalAllocationAuthorityResult {
  authority: 'TECHNOLOGY_CAPITAL_ALLOCATION_AUTHORITY';
  tenantId: string;
  verdict: 'READY' | 'PARTIAL' | 'NOT_READY';
  score: number;
  allocationCoverage: { total: number; withDecision: number; ratio: number };
  decisionConfidenceCoverage: { averageConfidence: number };
  evidenceCoverage: { total: number; withEvidence: number; ratio: number };
  economicsReadinessCoverage: { total: number; ready: number; ratio: number };
  reviewBacklog: { total: number; reviewCount: number; ratio: number };
  reasoning: string;
}

export type TechnologyRenewalDecision = 'RENEW' | 'REVIEW' | 'RETIRE';

export interface TechnologyRenewalRecommendation {
  id: string;
  tenantId: string;
  assetId: string;
  decision: TechnologyRenewalDecision;
  renewalTracked: boolean;
  hasContract: boolean;
  rationale: string[];
  confidenceScore: number;
  generatedAt: string;
}
