import type { TrustBand, TrustFindingType } from "../trust/trust-types";

export type EvidenceChainStep = {
  step: "DISCOVERY_SOURCE" | "NORMALIZED_ENTITY" | "TRUST_SCORE_INPUTS" | "READINESS_DECISION" | "POLICY_GATE" | "APPROVAL_STATE" | "EXECUTION_REQUEST_STATE" | "DRY_RUN_STATE" | "OUTCOME_STATE";
  label: string;
  state: string;
  evidence: Record<string, unknown>;
};

export type RecommendationFinding = {
  findingId: string;
  findingType: TrustFindingType | "READINESS_BLOCKER";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedValue: number;
  status: "OPEN" | "RESOLVED" | "SUPPRESSED" | "INVESTIGATING";
};

export type ResolutionStep = {
  blockerType: string;
  title: string;
  description: string;
  linkTarget: string;
  unlockValue: number;
  remediationOnly: true;
};

export type RecommendationExplainability = {
  recommendationId: string;
  tenantId: string;
  actionType: string;
  playbookId: string;
  currentState: string;
  readinessState: string;
  trustBand: TrustBand;
  projectedSavings: number;
  blockedValue: number;
  explanationSummary: string;
  evidenceChain: EvidenceChainStep[];
  trustFindings: RecommendationFinding[];
  policyFindings: RecommendationFinding[];
  affectedEntities: Array<{ entityType: string; entityId: string; label: string }>;
  resolutionSteps: ResolutionStep[];
  unlockValue: number;
};

export type TrustResolution = {
  recommendationId: string;
  tenantId: string;
  blockedValue: number;
  unlockValue: number;
  resolutionSteps: ResolutionStep[];
  trustFindings: RecommendationFinding[];
  policyFindings: RecommendationFinding[];
};
