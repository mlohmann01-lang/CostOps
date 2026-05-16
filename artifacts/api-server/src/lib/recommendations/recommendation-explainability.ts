export type RecommendationExplainabilityInput = {
  playbookId: string;
  playbookName: string;
  matched: boolean;
  suppression?: { reasonCode: string; reasonText: string } | null;
  trustBand?: string;
  findingsBlock?: boolean;
  trust: {
    executionGate: string;
    criticalBlockers: string[];
    warnings: string[];
    entityTrustScore: number;
    recommendationTrustScore: number;
    executionReadinessScore: number;
    savingsConfidence: number;
  };
  evidence: Record<string, unknown>;
  trustGovernanceDecisions: Array<{ stage: string; decision: string; reason: string }>;
};

export function buildRecommendationExplainability(input: RecommendationExplainabilityInput) {
  const blocked = input.trust.executionGate === "BLOCKED" || (input.suppression != null);
  const downgraded = input.trust.warnings.some((w) => w.includes("DOWNGRADE"));

  return {
    version: "checkpoint-24-v1",
    whyExists: input.matched ? "PLAYBOOK_MATCH" : "NO_MATCH",
    safeStatus: blocked ? "UNSAFE_OR_BLOCKED" : "SAFE_WITH_GOVERNANCE",
    blockedOrDowngraded: blocked ? "BLOCKED" : downgraded ? "DOWNGRADED" : "NONE",
    blockedReason: input.suppression?.reasonCode ?? (blocked ? "TRUST_GATE_BLOCK" : null),
    evidenceContributors: Object.keys(input.evidence).sort(),
    evidenceLineage: {
      playbookId: input.playbookId,
      playbookName: input.playbookName,
      trustBand: input.trustBand ?? "UNKNOWN",
      findingsBlock: Boolean(input.findingsBlock),
    },
    trustGovernanceDecisions: input.trustGovernanceDecisions,
    projectedSavingsConfidence: {
      score: Number(input.trust.savingsConfidence.toFixed(4)),
      derivation: "recommendation_input.savings_confidence",
    },
  };
}
