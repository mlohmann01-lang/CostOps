import test from "node:test";
import assert from "node:assert/strict";
import { PolicySimulationService } from "../lib/simulations/policy-simulation-service";

const svc = new PolicySimulationService();
const base = {
  tenantId: "t1", simulationName: "test", connectorType: "m365", simulationScope: "POLICY" as const, scopeEntityIds: ["p1"],
  projectedMonthlySavings: 18400, projectedAffectedUsers: 182, projectedAffectedGroups: 14, projectedAffectedLicenses: 182,
  privilegedEntities: 4, unresolvedBlockers: 1, lowOrQuarantinedTrustEntities: 3, staleEvidenceEntities: 6,
  actionType: "REMOVE_LICENSE", entitlementType: "M365_E3", connectorReliabilityScore: 88, policyExceptionCount: 1, governanceSensitivityScore: 44,
  forecastInput: { historicalRealizationRate: 0.96, historicalDriftRate: 0.08, historicalReversalRate: 0.04, projectedVsRealizedDeltaPercent: 14, confidenceCalibratedRate: 0.81 },
};

test("simulation computes deterministic projections and risks", () => {
  const out = svc.simulate(base);
  assert.equal(out.simulationStatus, "COMPLETED");
  assert.equal(out.projectedAnnualizedSavings, 220800);
  assert.equal(out.blastRadiusScore >= 0 && out.blastRadiusScore <= 100, true);
  assert.equal(out.reversibilityRiskScore >= 0 && out.reversibilityRiskScore <= 100, true);
  assert.equal(out.governanceRiskScore >= 0 && out.governanceRiskScore <= 100, true);
});
