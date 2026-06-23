// Program AO1 — Recommendation Orchestration. Capability 1: canonical
// execution plan model. Converts Technology Capital Allocation
// recommendations into executable packages — never executes anything,
// only prepares the package.

export type RecommendationOrchestrationExecutionType =
  | 'RETIRE'
  | 'RENEW'
  | 'OPTIMISE'
  | 'EXPAND'
  | 'CONSOLIDATE';

export type RecommendationOrchestrationReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface RecommendationExecutionPlan {
  id: string;

  tenantId: string;

  recommendationId: string;

  recommendationType: string;

  executionType: RecommendationOrchestrationExecutionType;

  requiredApprovals: string[];

  requiredEvidence: string[];

  executionSystems: string[];

  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';

  readiness: RecommendationOrchestrationReadiness;

  blockers: string[];
}

/**
 * Capability AO1.10: every execution package exposes its supporting proof
 * pack, evidence, findings and recommendation — never a new evidence
 * artifact, only references to what already exists upstream.
 */
export interface RecommendationExecutionPackage {
  plan: RecommendationExecutionPlan;
  assetId: string;
  supportingProofPack: { available: boolean; packCount: number; readyCount: number };
  supportingEvidence: string[];
  supportingFindings: string[];
  supportingRecommendation: string;
  narrative: string;
  generatedAt: string;
}

export type RecommendationQueueBucket = 'READY_FOR_EXECUTION' | 'AWAITING_APPROVAL' | 'AWAITING_EVIDENCE' | 'BLOCKED';

export interface RecommendationOrchestrationQueue {
  tenantId: string;
  readyForExecution: RecommendationExecutionPlan[];
  awaitingApproval: RecommendationExecutionPlan[];
  awaitingEvidence: RecommendationExecutionPlan[];
  blocked: RecommendationExecutionPlan[];
  generatedAt: string;
}

export type RecommendationOrchestrationVerdict = 'READY' | 'PARTIAL' | 'NOT_READY';

export interface RecommendationOrchestrationAuthorityResult {
  authority: 'RECOMMENDATION_ORCHESTRATION_AUTHORITY';
  tenantId: string;
  verdict: RecommendationOrchestrationVerdict;
  score: number;
  executionReadinessCoverage: { total: number; ready: number; ratio: number };
  approvalCoverage: { total: number; withApprovals: number; ratio: number };
  evidenceCoverage: { total: number; withEvidence: number; ratio: number };
  orchestrationCoverage: { total: number; withPlan: number; ratio: number };
  reasoning: string;
}
