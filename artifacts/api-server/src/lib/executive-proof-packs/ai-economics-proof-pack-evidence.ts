import type { AIEconomicProfileLineage } from '../ai-economics/ai-economics-types';

export interface AIEconomicsSummaryEntry {
  economicProfileId: string;
  profileName: string;
  totalSpend: number;
  totalAttributedValue: number;
  verifiedValue: number;
  protectedValue: number;
  valueToCostRatio: number;
  verdict: string;
  confidence: number;
}

/** Workstream 13: "AI Economics Summary" section reusing spend, attributed/verified/protected value, ratio, verdict, confidence — no new proof pack type. */
export function buildAIEconomicsSummaryMetrics(lineages: AIEconomicProfileLineage[]): {
  aiEconomicsSummary: { profileCount: number; totalSpend: number; totalAttributedValue: number; topProfiles: AIEconomicsSummaryEntry[] };
} {
  const entries: AIEconomicsSummaryEntry[] = lineages.map((lineage) => ({
    economicProfileId: lineage.profile.id,
    profileName: lineage.profile.profileName,
    totalSpend: lineage.evaluation.totalSpend,
    totalAttributedValue: lineage.evaluation.totalAttributedValue,
    verifiedValue: lineage.evaluation.verifiedValue,
    protectedValue: lineage.evaluation.protectedValue,
    valueToCostRatio: lineage.evaluation.valueToCostRatio,
    verdict: lineage.evaluation.verdict,
    confidence: lineage.evaluation.confidence,
  }));
  const topProfiles = [...entries].sort((a, b) => b.totalAttributedValue - a.totalAttributedValue).slice(0, 5);
  return {
    aiEconomicsSummary: {
      profileCount: lineages.length,
      totalSpend: entries.reduce((sum, e) => sum + e.totalSpend, 0),
      totalAttributedValue: entries.reduce((sum, e) => sum + e.totalAttributedValue, 0),
      topProfiles,
    },
  };
}

export function buildAIEconomicsProofPackEvidence(lineages: AIEconomicProfileLineage[]) {
  return lineages.flatMap((lineage) => lineage.costSignals
    .filter((s) => s.confidence !== undefined)
    .map((s) => ({
      evidenceRef: s.id,
      targetId: lineage.profile.id,
      trustLevel: (s.confidence ?? 0) >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
    })));
}
