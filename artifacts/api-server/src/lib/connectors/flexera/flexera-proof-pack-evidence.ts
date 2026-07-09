import type { GovernedRecommendationObject } from '../../recommendations/types';

export type FlexeraProofPackEvidenceInput = {
  evidenceRef: string;
  targetId: string;
  sourceSystem: 'FLEXERA';
  owner?: string;
  trustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CERTIFIED';
  integrityStatus: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
  redactionStatus: 'NOT_REQUIRED' | 'PENDING' | 'REDACTED' | 'FAILED';
  manualOnly: true;
  executionReadiness: string;
};

function trustLevelFromScore(trustScore: number): FlexeraProofPackEvidenceInput['trustLevel'] {
  if (trustScore >= 90) return 'CERTIFIED';
  if (trustScore >= 70) return 'HIGH';
  if (trustScore >= 50) return 'MEDIUM';
  return 'LOW';
}

// Maps Flexera governed recommendations + their connector trust snapshot into the same
// evidence-input shape ExecutiveProofPackService.buildProofPack/buildEvidenceBindings already
// accepts for every connector, so no new proof pack type or builder logic is required.
export function buildFlexeraProofPackEvidence(
  recommendations: GovernedRecommendationObject[],
  trustSnapshot: { trustScore: number },
  owners: Record<string, string | undefined> = {},
): FlexeraProofPackEvidenceInput[] {
  const trustLevel = trustLevelFromScore(trustSnapshot.trustScore);
  return recommendations
    .filter((r) => Boolean(r.targetEntityId))
    .map((r) => ({
      evidenceRef: r.evidencePointers[0] ?? `flexera:${r.recommendationId}`,
      targetId: r.targetEntityId,
      sourceSystem: 'FLEXERA' as const,
      owner: owners[r.targetEntityId],
      trustLevel,
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
      manualOnly: true as const,
      executionReadiness: r.executionReadiness,
    }));
}
