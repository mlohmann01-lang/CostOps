import type { DiscoveryLifecycleState } from "../discovery-intelligence/types";

export const RECOMMENDATION_STATES = ["CANDIDATE","EVIDENCE_READY","APPROVAL_REQUIRED","EXECUTION_READY","BLOCKED","EXECUTED","VERIFIED","DRIFTED"] as const;
export type RecommendationState = (typeof RECOMMENDATION_STATES)[number];

export const EXECUTION_READINESS_STATES = ["AUTO_EXECUTE_ELIGIBLE","APPROVAL_REQUIRED","MANUAL_ONLY","BLOCKED","NEVER_ELIGIBLE"] as const;
export type ExecutionReadiness = (typeof EXECUTION_READINESS_STATES)[number];

export type ReliabilityBand = "LOW" | "MEDIUM" | "HIGH";
export type SavingsConfidence = "LOW" | "MEDIUM" | "HIGH" | "VERIFIED";
export type ActionRiskClass = "A" | "B" | "C" | "D";

export type GovernedRecommendationObject = {
  recommendationId: string;
  tenantId: string;
  playbookId: string;
  targetEntityId: string;
  targetEntityType: string;
  graphNodeIds: string[];
  graphEdgeIds: string[];
  discoveryLifecycleState: DiscoveryLifecycleState;
  confidenceScore: number;
  reliabilityBand: ReliabilityBand;
  projectedMonthlySavings: number;
  projectedAnnualSavings: number;
  savingsConfidence: SavingsConfidence;
  actionType: string;
  actionRiskClass: ActionRiskClass;
  executionReadiness: ExecutionReadiness;
  readinessReasons: string[];
  blockedReasons: string[];
  requiredApprovals: string[];
  evidencePointers: string[];
  createdAt: string;
  updatedAt: string;
  recommendationState: RecommendationState;
};

export type GovernedRecommendationInput = Omit<GovernedRecommendationObject, "executionReadiness" | "readinessReasons" | "blockedReasons" | "requiredApprovals" | "recommendationState" | "createdAt" | "updatedAt"> & {
  manualOnly?: boolean;
  neverEligible?: boolean;
  hasApproval?: boolean;
};
