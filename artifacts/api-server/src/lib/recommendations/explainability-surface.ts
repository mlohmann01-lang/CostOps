type ExplainabilityEnvelope = {
  recommendationId: number;
  tenantId: string;
  playbookId: string;
  playbookName: string;
  status: string;
  recommendationStatus: string;
  explainabilityVersion: string;
  explainability: Record<string, unknown>;
  evidenceLineage: {
    canonicalOrder: string[];
    contributors: Array<{ key: string; value: unknown }>;
  };
};

function asObject(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input == null || Array.isArray(input)) {
    return {};
  }
  return input as Record<string, unknown>;
}

export function buildExplainabilityEnvelope(recommendation: Record<string, unknown>): ExplainabilityEnvelope {
  const evidenceSummary = asObject(recommendation.evidenceSummary);
  const explainability = asObject(evidenceSummary.explainability);
  const playbookEvidence = asObject(recommendation.playbookEvidence);
  const contributorKeys = Object.keys(playbookEvidence).sort();

  return {
    recommendationId: Number(recommendation.id ?? 0),
    tenantId: String(recommendation.tenantId ?? "default"),
    playbookId: String(recommendation.playbookId ?? ""),
    playbookName: String(recommendation.playbookName ?? ""),
    status: String(recommendation.status ?? "pending"),
    recommendationStatus: String(recommendation.recommendationStatus ?? "CANDIDATE"),
    explainabilityVersion: String(explainability.version ?? "checkpoint-24-v1"),
    explainability,
    evidenceLineage: {
      canonicalOrder: contributorKeys,
      contributors: contributorKeys.map((key) => ({ key, value: playbookEvidence[key] })),
    },
  };
}

