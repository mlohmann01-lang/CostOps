import type { InvestmentLineage } from '../value-realisation/value-realisation-types';

export interface ValueRealisationSummaryEntry {
  investmentId: string;
  investmentName: string;
  businessCapability?: string;
  valueHypothesis?: string;
  expectedValueAmount?: number;
  totalVerifiedValue: number;
  totalProtectedValue: number;
  confidence: number;
  verdict: string;
  linkedDecisionIds: string[];
  linkedOutcomeIds: string[];
  evidenceRefs: string[];
}

export function buildValueRealisationSummaryMetrics(lineages: InvestmentLineage[], capabilityNamesById: Record<string, string> = {}): { valueRealisationSummary: ValueRealisationSummaryEntry[] } {
  return {
    valueRealisationSummary: lineages.map((lineage) => {
      const businessCapability = lineage.capabilities[0] ? capabilityNamesById[lineage.capabilities[0].capabilityId] : undefined;
      return {
        investmentId: lineage.investment.id,
        investmentName: lineage.investment.name,
        businessCapability,
        valueHypothesis: lineage.investment.valueHypothesis,
        expectedValueAmount: lineage.investment.expectedValueAmount,
        totalVerifiedValue: lineage.evaluation.totalVerifiedValue,
        totalProtectedValue: lineage.evaluation.totalProtectedValue,
        confidence: lineage.evaluation.confidence,
        verdict: lineage.evaluation.verdict,
        linkedDecisionIds: lineage.decisions.map((d) => d.decisionId),
        linkedOutcomeIds: [...new Set(lineage.attributions.map((a) => a.outcomeId).filter(Boolean) as string[])],
        evidenceRefs: [...new Set([...lineage.signals.map((s) => s.evidenceItemId), ...lineage.attributions.map((a) => a.evidenceItemId)].filter(Boolean) as string[])],
      };
    }),
  };
}

export function buildValueRealisationProofPackEvidence(lineages: InvestmentLineage[]) {
  return lineages.flatMap((lineage) => [
    ...lineage.signals.filter((s) => s.evidenceItemId).map((s) => ({
      evidenceRef: s.evidenceItemId as string,
      targetId: lineage.investment.id,
      trustLevel: (s.confidence ?? 0) >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
    })),
    ...lineage.attributions.filter((a) => a.evidenceItemId).map((a) => ({
      evidenceRef: a.evidenceItemId as string,
      targetId: lineage.investment.id,
      trustLevel: (a.attributionConfidence ?? 0) >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
    })),
  ]);
}
