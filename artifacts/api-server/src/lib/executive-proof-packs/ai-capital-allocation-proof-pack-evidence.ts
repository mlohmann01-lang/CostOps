import type { AICapitalAllocation } from '../ai-capital-allocation/ai-capital-allocation-types';

export function buildAICapitalAllocationSummaryMetrics(allocations: AICapitalAllocation[]): {
  aiCapitalAllocationSummary: {
    increaseCandidates: number;
    maintainCandidates: number;
    optimiseCandidates: number;
    pauseCandidates: number;
    reduceCandidates: number;
    stopCandidates: number;
    capitalConfidence: number;
  };
} {
  const countBy = (verdict: string) => allocations.filter((a) => a.allocationVerdict === verdict).length;
  const confidences = allocations.map((a) => a.allocationConfidence);
  return {
    aiCapitalAllocationSummary: {
      increaseCandidates: countBy('INCREASE'),
      maintainCandidates: countBy('MAINTAIN'),
      optimiseCandidates: countBy('OPTIMISE'),
      pauseCandidates: countBy('PAUSE'),
      reduceCandidates: countBy('REDUCE'),
      stopCandidates: countBy('STOP'),
      capitalConfidence: confidences.length ? Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 1000) / 1000 : 0,
    },
  };
}

export function buildAICapitalAllocationProofPackEvidence(allocations: AICapitalAllocation[]) {
  return allocations
    .filter((a) => a.allocationConfidence > 0)
    .map((a) => ({
      evidenceRef: a.id,
      targetId: a.initiativeId,
      trustLevel: a.allocationConfidence >= 0.8 ? 'HIGH' as const : 'MEDIUM' as const,
      integrityStatus: 'PASS' as const,
      redactionStatus: 'NOT_REQUIRED' as const,
    }));
}
