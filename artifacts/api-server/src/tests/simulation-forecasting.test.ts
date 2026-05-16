import test from "node:test";
import assert from "node:assert/strict";
import { PolicySimulationService } from "../lib/simulations/policy-simulation-service";

const svc = new PolicySimulationService();

const common = {
  tenantId: "t1", simulationName: "forecast", connectorType: "m365", simulationScope: "TENANT" as const, scopeEntityIds: ["tenant"],
  projectedMonthlySavings: 1000, projectedAffectedUsers: 20, projectedAffectedGroups: 2, projectedAffectedLicenses: 20,
  privilegedEntities: 1, unresolvedBlockers: 0, lowOrQuarantinedTrustEntities: 0, staleEvidenceEntities: 1,
  actionType: "REMOVE_LICENSE", entitlementType: "E3", connectorReliabilityScore: 90, policyExceptionCount: 0, governanceSensitivityScore: 20,
};

test("historical drift lowers confidence", () => {
  const hi = svc.simulate({ ...common, forecastInput: { historicalRealizationRate: 0.95, historicalDriftRate: 0.02, historicalReversalRate: 0.01, projectedVsRealizedDeltaPercent: 6, confidenceCalibratedRate: 0.9 } });
  const lo = svc.simulate({ ...common, forecastInput: { historicalRealizationRate: 0.95, historicalDriftRate: 0.25, historicalReversalRate: 0.01, projectedVsRealizedDeltaPercent: 6, confidenceCalibratedRate: 0.9 } });
  assert.equal(hi.predictedDriftRisk < lo.predictedDriftRisk, true);
});

test("reversal history increases risk", () => {
  const low = svc.simulate({ ...common, forecastInput: { historicalRealizationRate: 0.95, historicalDriftRate: 0.05, historicalReversalRate: 0.01, projectedVsRealizedDeltaPercent: 6, confidenceCalibratedRate: 0.9 } });
  const high = svc.simulate({ ...common, forecastInput: { historicalRealizationRate: 0.95, historicalDriftRate: 0.05, historicalReversalRate: 0.15, projectedVsRealizedDeltaPercent: 6, confidenceCalibratedRate: 0.9 } });
  assert.equal(low.predictedReversalRisk < high.predictedReversalRisk, true);
});
