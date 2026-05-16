import crypto from "node:crypto";

export type SimulationScope = "RECOMMENDATION" | "PLAYBOOK" | "POLICY" | "TENANT";

export type ForecastInput = {
  historicalRealizationRate: number;
  historicalDriftRate: number;
  historicalReversalRate: number;
  projectedVsRealizedDeltaPercent: number;
  confidenceCalibratedRate: number;
};

export type SimulationInput = {
  tenantId: string;
  simulationName: string;
  connectorType: string;
  simulationScope: SimulationScope;
  scopeEntityIds: string[];
  projectedMonthlySavings: number;
  projectedAffectedUsers: number;
  projectedAffectedGroups: number;
  projectedAffectedLicenses: number;
  privilegedEntities: number;
  unresolvedBlockers: number;
  lowOrQuarantinedTrustEntities: number;
  staleEvidenceEntities: number;
  graphDependencyChains?: number;
  linkedPrivilegedGroups?: number;
  actionType: string;
  entitlementType: string;
  connectorReliabilityScore: number;
  policyExceptionCount: number;
  governanceSensitivityScore: number;
  forecastInput: ForecastInput;
};

export class PolicySimulationService {
  readonly simulationEngineVersion = "policy-sim-v1";

  estimateBlastRadiusScore(input: SimulationInput): number {
    const base = Math.min(100, input.projectedAffectedUsers * 0.35 + input.projectedAffectedLicenses * 0.45 + input.projectedAffectedGroups * 0.2);
    const governanceBoost = input.governanceSensitivityScore * 0.15 + (input.graphDependencyChains ?? 0) * 1.5 + (input.linkedPrivilegedGroups ?? 0) * 2;
    const trustPenalty = input.lowOrQuarantinedTrustEntities > 0 ? 8 : 0;
    const historicalPenalty = (input.forecastInput.historicalDriftRate + input.forecastInput.historicalReversalRate) * 20;
    return clamp2(base + governanceBoost + trustPenalty + historicalPenalty);
  }

  estimateReversibilityRiskScore(input: SimulationInput): number {
    const actionBase = input.actionType.includes("REMOVE") ? 22 : 35;
    const entitlementPenalty = /admin|privileged/i.test(input.entitlementType) ? 35 : 10;
    const reversalPenalty = input.forecastInput.historicalReversalRate * 50;
    const reliabilityOffset = (100 - input.connectorReliabilityScore) * 0.2;
    const governancePenalty = input.unresolvedBlockers * 4;
    return clamp2(actionBase + entitlementPenalty + reversalPenalty + reliabilityOffset + governancePenalty);
  }

  estimateGovernanceRiskScore(input: SimulationInput): number {
    return clamp2(
      input.unresolvedBlockers * 20 +
      input.lowOrQuarantinedTrustEntities * 10 +
      input.privilegedEntities * 8 +
      input.policyExceptionCount * 6 +
      input.staleEvidenceEntities * 4,
    );
  }

  estimateTrustRiskScore(input: SimulationInput): number {
    return clamp2(input.lowOrQuarantinedTrustEntities * 18 + input.staleEvidenceEntities * 8 + (100 - input.connectorReliabilityScore) * 0.35);
  }

  forecastConfidence(input: ForecastInput): "LOW" | "MEDIUM" | "HIGH" | "VERIFIED" {
    const score = input.historicalRealizationRate * 100 - input.historicalDriftRate * 35 - input.historicalReversalRate * 45 - input.projectedVsRealizedDeltaPercent * 0.4 + input.confidenceCalibratedRate * 20;
    if (score >= 92) return "VERIFIED";
    if (score >= 78) return "HIGH";
    if (score >= 55) return "MEDIUM";
    return "LOW";
  }

  simulate(input: SimulationInput) {
    const blastRadiusScore = this.estimateBlastRadiusScore(input);
    const reversibilityRiskScore = this.estimateReversibilityRiskScore(input);
    const governanceRiskScore = this.estimateGovernanceRiskScore(input);
    const trustRiskScore = this.estimateTrustRiskScore(input);
    const predictedDriftRisk = clamp2(input.forecastInput.historicalDriftRate * 100 + trustRiskScore * 0.15);
    const predictedReversalRisk = clamp2(input.forecastInput.historicalReversalRate * 100 + reversibilityRiskScore * 0.2);
    const predictedRealizationConfidence = this.forecastConfidence(input.forecastInput);
    const projectedAnnualizedSavings = round2(input.projectedMonthlySavings * 12);

    const reasoning = {
      simulation: [
        `${input.scopeEntityIds.length} scope entities evaluated`,
        `${input.projectedAffectedLicenses} affected licenses in deterministic scope`,
        `${input.graphDependencyChains ?? 0} graph dependency chains considered`,
        `historical realization rate ${(input.forecastInput.historicalRealizationRate * 100).toFixed(1)}%`,
      ],
      governance: {
        unresolvedBlockers: input.unresolvedBlockers,
        privilegedEntitiesExcluded: input.privilegedEntities,
        policyExceptions: input.policyExceptionCount,
      },
      trust: {
        lowOrQuarantined: input.lowOrQuarantinedTrustEntities,
        staleEvidence: input.staleEvidenceEntities,
        connectorReliabilityScore: input.connectorReliabilityScore,
      },
      blast: {
        affectedUsers: input.projectedAffectedUsers,
        affectedGroups: input.projectedAffectedGroups,
        affectedLicenses: input.projectedAffectedLicenses,
        governanceSensitivityScore: input.governanceSensitivityScore,
      },
      timeline: ["Evidence", "Trust", "Governance", "Historical Intelligence", "Forecast", "Risk Classification"],
      nonAuthoritative: true,
    };

    const snapshot = {
      ...input,
      simulationStatus: "COMPLETED",
      projectedAnnualizedSavings,
      blastRadiusScore,
      reversibilityRiskScore,
      governanceRiskScore,
      trustRiskScore,
      predictedRealizationConfidence,
      predictedDriftRisk,
      predictedReversalRisk,
      simulationReasoning: reasoning.simulation,
      governanceReasoning: reasoning.governance,
      trustReasoning: reasoning.trust,
      blastRadiusReasoning: reasoning.blast,
      simulationEngineVersion: this.simulationEngineVersion,
    };
    const deterministicHash = this.computeDeterministicHash(snapshot);
    return { ...snapshot, deterministicHash, createdAt: new Date("2026-05-01T00:00:00.000Z") };
  }

  computeDeterministicHash(payload: unknown): string {
    return crypto.createHash("sha256").update(JSON.stringify(sortObj(payload))).digest("hex");
  }

  validateIntegrity(payload: { deterministicHash: string } & Record<string, unknown>): boolean {
    const { deterministicHash, ...rest } = payload;
    return deterministicHash === this.computeDeterministicHash(rest);
  }
}

function clamp2(n: number) { return round2(Math.max(0, Math.min(100, n))); }
function round2(n: number) { return Math.round(n * 100) / 100; }
function sortObj(v: any): any {
  if (Array.isArray(v)) return v.map(sortObj);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((a: any, k) => (a[k] = sortObj(v[k]), a), {});
  return v;
}
