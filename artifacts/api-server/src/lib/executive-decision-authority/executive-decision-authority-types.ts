// Program EX2 — Executive Decision Authority. Capability 1: canonical
// executive decision model. Converts X4's technology capital allocation
// recommendations (and AI Economics/AI Capital Allocation) into executive
// decisions — never recomputes recommendation logic or economics.

export type ExecutiveDecisionOutput =
  | 'APPROVE_EXPANSION' | 'APPROVE_RENEWAL' | 'APPROVE_OPTIMISATION' | 'APPROVE_CONSOLIDATION'
  | 'APPROVE_RETIREMENT' | 'REQUIRE_REVIEW' | 'INSUFFICIENT_EVIDENCE';

export type ExecutiveConfidence = 'LOW' | 'MODERATE' | 'HIGH' | 'VERIFIED';

export interface ExecutiveProofPackAvailability {
  packCount: number;
  readyCount: number;
  averageReadinessScore: number;
  available: boolean;
}

export interface ExecutiveDecisionRecord {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  decision: ExecutiveDecisionOutput;
  executiveConfidence: ExecutiveConfidence;
  evidence: string[];
  supportingFindings: string[];
  supportingRecommendations: string[];
  proofPackAvailability: ExecutiveProofPackAvailability;
  narrative: string;
  generatedAt: string;
}

export interface ExecutiveDecisionSummary {
  tenantId: string;
  totalTechnologies: number;
  approveExpansionCount: number;
  approveRenewalCount: number;
  approveOptimisationCount: number;
  approveConsolidationCount: number;
  approveRetirementCount: number;
  requireReviewCount: number;
  insufficientEvidenceCount: number;
  averageExecutiveConfidence: number;
  generatedAt: string;
}

export interface ExecutiveDecisionQueueEntry {
  priority: number;
  decision: string;
  assetId: string;
  confidence: string;
  rationale: string[];
}

export type ExecutiveDecisionAuthorityVerdict = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface ExecutiveDecisionAuthorityResult {
  authority: 'EXECUTIVE_DECISION_AUTHORITY';
  tenantId: string;
  verdict: ExecutiveDecisionAuthorityVerdict;
  score: number;
  decisionCoverage: { total: number; withDecision: number; ratio: number };
  evidenceCoverage: { total: number; withEvidence: number; ratio: number };
  economicsCoverage: { total: number; withEconomics: number; ratio: number };
  allocationCoverage: { total: number; withAllocation: number; ratio: number };
  proofPackCoverage: { available: boolean; packCount: number };
  reasoning: string;
}
