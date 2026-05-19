import type { ArbitrationScoreInput } from './arbitration-score-contract';

export const buildArbitrationExplanation = (input: ArbitrationScoreInput, governanceClass: string): string =>
  `Deterministic arbitration review: savings=${input.savingsMagnitude.toFixed(2)}, confidence=${input.confidence.toFixed(2)}, governanceRisk=${input.governanceRisk.toFixed(2)}, auditExposure=${input.auditExposure.toFixed(2)}, recurrenceRisk=${input.recurrenceRisk.toFixed(2)}, class=${governanceClass}.`;
