import type { Decision, DecisionLineage } from '../decision-authority/decision-authority-types';

export type DecisionProofPackEvidenceInput = {
  evidenceRef: string;
  targetId?: string;
  trustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CERTIFIED';
  integrityStatus: 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN';
  redactionStatus: 'NOT_REQUIRED' | 'PENDING' | 'REDACTED' | 'FAILED';
};

export interface DecisionSummaryEntry {
  decisionId: string;
  decisionType: Decision['decisionType'];
  status: Decision['status'];
  title: string;
  rationale: string[];
  sourceSystem: string;
  sourceReference: string;
  trustSnapshot?: Decision['trustSnapshot'];
  principalChain: Array<{ principalId: string; role: string }>;
  assetContext: Array<{ assetId: string; relationshipType: string }>;
  evidenceRefs: string[];
  linkedOutcome?: { outcomeId: string; relationshipType: string };
}

function trustLevelFromScore(trustScore?: number): DecisionProofPackEvidenceInput['trustLevel'] {
  if (trustScore === undefined) return 'MEDIUM';
  if (trustScore >= 90) return 'CERTIFIED';
  if (trustScore >= 70) return 'HIGH';
  if (trustScore >= 50) return 'MEDIUM';
  return 'LOW';
}

function latestOutcomeRelationship(outcomes: DecisionLineage['outcomes']): DecisionLineage['outcomes'][number] | undefined {
  const order = { EXPECTED: 0, VERIFIED: 1, PROTECTED: 2 } as const;
  return outcomes.reduce<DecisionLineage['outcomes'][number] | undefined>((best, current) => {
    if (!best || order[current.relationshipType] >= order[best.relationshipType]) return current;
    return best;
  }, undefined);
}

/**
 * Maps Decision Authority lineage into the existing Executive Proof Pack
 * metrics shape so Decision Summary/Principal Chain/Asset Context/Outcome
 * Summary reuse the same packs and sections every other connector uses —
 * no new pack type or section key is introduced.
 */
export function buildDecisionSummaryMetrics(lineages: DecisionLineage[]): { decisionSummary: DecisionSummaryEntry[] } {
  return {
    decisionSummary: lineages.map((lineage) => {
      const linkedOutcome = latestOutcomeRelationship(lineage.outcomes);
      return {
        decisionId: lineage.decision.id,
        decisionType: lineage.decision.decisionType,
        status: lineage.decision.status,
        title: lineage.decision.title,
        rationale: lineage.decision.rationale,
        sourceSystem: lineage.decision.sourceSystem,
        sourceReference: lineage.decision.sourceReference,
        trustSnapshot: lineage.decision.trustSnapshot,
        principalChain: lineage.principals.map((p) => ({ principalId: p.principalId, role: p.role })),
        assetContext: lineage.assets.map((a) => ({ assetId: a.assetId, relationshipType: a.relationshipType })),
        evidenceRefs: lineage.evidence.map((e) => e.evidenceItemId),
        linkedOutcome: linkedOutcome ? { outcomeId: linkedOutcome.outcomeId, relationshipType: linkedOutcome.relationshipType } : undefined,
      };
    }),
  };
}

export function buildDecisionProofPackEvidence(lineages: DecisionLineage[]): DecisionProofPackEvidenceInput[] {
  return lineages.flatMap((lineage) =>
    lineage.evidence.map((evidenceLink) => ({
      evidenceRef: evidenceLink.evidenceItemId,
      targetId: lineage.decision.primaryAssetId,
      trustLevel: trustLevelFromScore(lineage.decision.trustSnapshot?.trustScore),
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
    })),
  );
}
