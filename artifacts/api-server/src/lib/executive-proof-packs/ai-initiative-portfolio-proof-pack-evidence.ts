import type { InitiativeLineage } from '../ai-initiative-portfolio/ai-initiative-portfolio-types';

export interface AIInitiativePortfolioSummaryEntry {
  initiativeId: string;
  name: string;
  initiativeType: string;
  portfolioVerdict: string;
  economicVerdict: string;
  attributedValue: number;
  totalSpend: number;
  confidence: number;
}

export function buildAIInitiativePortfolioSummaryMetrics(lineages: InitiativeLineage[]): {
  aiInitiativePortfolioSummary: {
    initiativeCount: number;
    scaleCandidates: number;
    maintainCandidates: number;
    optimiseCandidates: number;
    reviewCandidates: number;
    retireCandidates: number;
    experimentCandidates: number;
    portfolioValue: number;
    portfolioSpend: number;
    portfolioEfficiency: number;
    topInitiatives: AIInitiativePortfolioSummaryEntry[];
  };
} {
  const entries: AIInitiativePortfolioSummaryEntry[] = lineages.map((lineage) => ({
    initiativeId: lineage.initiative.id,
    name: lineage.initiative.name,
    initiativeType: lineage.initiative.initiativeType,
    portfolioVerdict: lineage.evaluation.portfolioVerdict,
    economicVerdict: lineage.evaluation.economicVerdict,
    attributedValue: lineage.evaluation.attributedValue,
    totalSpend: lineage.evaluation.totalSpend,
    confidence: lineage.evaluation.confidence,
  }));
  const countBy = (verdict: string) => entries.filter((e) => e.portfolioVerdict === verdict).length;
  const portfolioValue = entries.reduce((sum, e) => sum + e.attributedValue, 0);
  const portfolioSpend = entries.reduce((sum, e) => sum + e.totalSpend, 0);
  const topInitiatives = [...entries].sort((a, b) => b.attributedValue - a.attributedValue).slice(0, 5);
  return {
    aiInitiativePortfolioSummary: {
      initiativeCount: entries.length,
      scaleCandidates: countBy('SCALE'),
      maintainCandidates: countBy('MAINTAIN'),
      optimiseCandidates: countBy('OPTIMISE'),
      reviewCandidates: countBy('REVIEW'),
      retireCandidates: countBy('RETIRE'),
      experimentCandidates: countBy('EXPERIMENT'),
      portfolioValue,
      portfolioSpend,
      portfolioEfficiency: portfolioSpend > 0 ? Math.round((portfolioValue / portfolioSpend) * 1000) / 1000 : 0,
      topInitiatives,
    },
  };
}

export function buildAIInitiativePortfolioProofPackEvidence(lineages: InitiativeLineage[]) {
  return lineages
    .filter((lineage) => lineage.evaluation.confidence !== undefined)
    .map((lineage) => ({
      evidenceRef: lineage.evaluation.id,
      targetId: lineage.initiative.id,
      trustLevel: lineage.evaluation.confidence >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
    }));
}
