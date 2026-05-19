import type { ArbitrationScoreInput } from './arbitration-score-contract';

export const evaluateArbitrationThresholds = (input: ArbitrationScoreInput): 'READ_ONLY' | 'RECOMMEND_ONLY' | 'APPROVAL_REQUIRED' => {
  if (input.confidence < 0.45 || input.auditExposure > 0.7 || input.governanceRisk > 0.7 || input.executiveMateriality > 0.75) return 'APPROVAL_REQUIRED';
  if (input.businessCriticality > 0.7 || input.volatilityRisk > 0.7 || input.recurrenceRisk > 0.7) return 'APPROVAL_REQUIRED';
  if (input.savingsMagnitude < 0.2) return 'READ_ONLY';
  return 'RECOMMEND_ONLY';
};
