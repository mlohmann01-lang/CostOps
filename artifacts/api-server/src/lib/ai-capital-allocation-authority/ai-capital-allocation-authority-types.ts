// Program E2 — AI Capital Allocation Authority. Capability 1: canonical
// allocation model.
//
// Answers "where should we invest the next AI dollar?" by joining E1's
// economics, AI3's value graph, AI2's initiative portfolio, and AI1's
// attribution confidence. Never fabricates ROI, value, or recommendations —
// every decision must reference real evidence already produced upstream.

export type AICapitalAllocationDecision = 'EXPAND' | 'KEEP' | 'OPTIMISE' | 'CONSOLIDATE' | 'RETIRE' | 'REVIEW';
export type AICapitalAllocationConfidence = 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';

export interface AICapitalAllocationRecommendation {
  id: string;
  tenantId: string;
  initiativeId: string;

  decision: AICapitalAllocationDecision;

  confidenceScore: number;
  confidenceLevel: AICapitalAllocationConfidence;

  rationale: string[];
  evidenceIds: string[];

  economicsReadiness: 'READY' | 'PARTIAL' | 'NOT_READY';

  generatedAt: string;
}

export interface AICapitalAllocationSummary {
  tenantId: string;
  totalInitiatives: number;
  expandCount: number;
  keepCount: number;
  optimiseCount: number;
  consolidateCount: number;
  retireCount: number;
  reviewCount: number;
  averageConfidence: number;
  executiveSummary: string;
  generatedAt: string;
}

export interface AICapitalAllocationAuthorityResult {
  authority: 'AI_CAPITAL_ALLOCATION_AUTHORITY';
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
