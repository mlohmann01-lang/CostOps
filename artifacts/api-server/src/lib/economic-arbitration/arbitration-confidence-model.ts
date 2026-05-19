import type { ArbitrationScoreInput } from './arbitration-score-contract';

export const computeArbitrationConfidence = (input: ArbitrationScoreInput): number => Number((
  input.confidence * 0.45 + input.evidenceQuality * 0.35 + (1 - input.recurrenceRisk) * 0.2
).toFixed(4));
