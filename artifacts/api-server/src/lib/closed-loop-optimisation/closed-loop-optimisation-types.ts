// Program AO2 — Capability AO2.1: canonical closed-loop optimisation model.
// Tracks a single technology recommendation from RECOMMENDED through
// LEARNING_COMPLETE — never executes anything, only observes and reports on
// real state already recorded by Recommendation Orchestration, Governed
// Approvals, Governed Executions, Outcome Protection and Outcome/Technology
// Economics.

export type OptimisationLifecycleState =
  | 'RECOMMENDED'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'VERIFIED'
  | 'PROTECTED'
  | 'VALUE_REALISED'
  | 'LEARNING_COMPLETE'
  | 'FAILED';

export interface ClosedLoopOptimisation {
  id: string;

  tenantId: string;

  recommendationId: string;

  executionPlanId: string;

  lifecycleState: OptimisationLifecycleState;

  approvalId?: string;

  executionId?: string;

  verificationId?: string;

  protectionId?: string;

  outcomeId?: string;

  learningId?: string;

  createdAt: string;

  updatedAt: string;
}

/** Capability AO2.8: Learning Engine. Lessons must be evidence-derived — never speculative. */
export interface OptimisationLearning {
  recommendationId: string;

  executionSucceeded: boolean;

  verificationSucceeded: boolean;

  protectionSucceeded: boolean;

  valueRealised: boolean;

  confidenceDelta: number;

  lessonsLearned: string[];
}

export type ClosedLoopReadiness = 'READY' | 'PARTIAL' | 'NOT_READY';

/** Capability AO2.9/AO2.10: closed-loop authority verdict. */
export interface ClosedLoopOptimisationAuthorityResult {
  authority: 'CLOSED_LOOP_OPTIMISATION_AUTHORITY';
  tenantId: string;
  verdict: ClosedLoopReadiness;
  score: number;
  approvalCoverage: { total: number; covered: number; ratio: number };
  executionCoverage: { total: number; covered: number; ratio: number };
  verificationCoverage: { total: number; covered: number; ratio: number };
  protectionCoverage: { total: number; covered: number; ratio: number };
  valueCoverage: { total: number; covered: number; ratio: number };
  learningCoverage: { total: number; covered: number; ratio: number };
  reasoning: string;
}

/** Capability AO2.11: portfolio view bucketed by lifecycle state. */
export interface ClosedLoopOptimisationPortfolio {
  tenantId: string;
  recommendations: ClosedLoopOptimisation[];
  approved: ClosedLoopOptimisation[];
  executing: ClosedLoopOptimisation[];
  verified: ClosedLoopOptimisation[];
  protected: ClosedLoopOptimisation[];
  valueRealised: ClosedLoopOptimisation[];
  learningComplete: ClosedLoopOptimisation[];
  failed: ClosedLoopOptimisation[];
  generatedAt: string;
}

/** Capability AO2.13: proof pack integration — references only, never new evidence. */
export interface ClosedLoopProofPack {
  optimisationId: string;
  assetId: string;
  proofPack: { available: boolean; packCount: number; readyCount: number };
  evidence: string[];
  recommendation: string;
  executionPackage: { planId: string; narrative: string };
  verificationResult?: { status: string; verifiedValue?: number; currency?: string };
}
