export interface ArbitrationScoreInput {
  savingsMagnitude: number;
  confidence: number;
  evidenceQuality: number;
  executiveMateriality: number;
  recurrenceRisk: number;
  governanceRisk: number;
  resilienceRisk: number;
  volatilityRisk: number;
  auditExposure: number;
  businessCriticality: number;
  reversibility: number;
  timingUrgency: number;
}

export const computeArbitrationScore = (input: ArbitrationScoreInput): number => Number((
  input.savingsMagnitude * 0.25 +
  input.confidence * 0.1 +
  input.evidenceQuality * 0.1 -
  input.executiveMateriality * 0.08 -
  input.recurrenceRisk * 0.08 -
  input.governanceRisk * 0.12 -
  input.resilienceRisk * 0.08 -
  input.volatilityRisk * 0.06 -
  input.auditExposure * 0.08 -
  input.businessCriticality * 0.03 +
  input.reversibility * 0.06 -
  input.timingUrgency * 0.04
).toFixed(4));
