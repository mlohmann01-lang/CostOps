/**
 * ai-simulation-state.ts
 *
 * Canonical simulation types used by all AI pack simulation layers.
 * These types form the shared data contract between simulation generators
 * and the verification strategies that validate post-execution outcomes.
 */

// ---------------------------------------------------------------------------
// Before/after state shapes
// ---------------------------------------------------------------------------

export type AISimulationBeforeState = {
  provider: string;
  modelId: string | null;
  monthlyTokens: number;
  monthlyCostUSD: number;
  activeSeats: number;
  idleSeats: number;
  agentCount: number;
  /** Context window utilization expressed as a fraction in the range 0–1. */
  contextWindowUtilization: number;
};

export type AISimulationProposedState = {
  provider: string;
  modelId: string | null;
  monthlyTokens: number;
  monthlyCostUSD: number;
  activeSeats: number;
  idleSeats: number;
  agentCount: number;
  contextWindowUtilization: number;
  /** Human-readable list of changes applied in this proposed state. */
  changesApplied: string[];
};

export type AISimulationResult = {
  tenantId: string;
  executionId: string;
  scenarioType: string;
  beforeState: AISimulationBeforeState;
  proposedState: AISimulationProposedState;
  projectedMonthlySavingsUSD: number;
  projectedAnnualSavingsUSD: number;
  /** Confidence score expressed as a fraction in the range 0–1. */
  confidenceScore: number;
  qualityRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
  /** ISO-8601 timestamp at which the simulation was generated. */
  simulatedAt: string;
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Constructs an AISimulationResult from before/proposed states.
 *
 * Projected savings are derived from the cost delta:
 *   projectedMonthlySavingsUSD = before.monthlyCostUSD - proposed.monthlyCostUSD
 *   projectedAnnualSavingsUSD  = projectedMonthlySavingsUSD * 12
 */
export function buildSimulationResult(
  tenantId: string,
  executionId: string,
  scenarioType: string,
  before: AISimulationBeforeState,
  proposed: AISimulationProposedState,
  confidenceScore: number,
  qualityRisk: AISimulationResult['qualityRisk'],
  blastRadius: AISimulationResult['blastRadius'],
): AISimulationResult {
  const projectedMonthlySavingsUSD = before.monthlyCostUSD - proposed.monthlyCostUSD;
  const projectedAnnualSavingsUSD = projectedMonthlySavingsUSD * 12;

  return {
    tenantId,
    executionId,
    scenarioType,
    beforeState: before,
    proposedState: proposed,
    projectedMonthlySavingsUSD,
    projectedAnnualSavingsUSD,
    confidenceScore,
    qualityRisk,
    blastRadius,
    simulatedAt: new Date().toISOString(),
  };
}
