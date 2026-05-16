import test from "node:test";
import assert from "node:assert/strict";
import { PolicySimulationService } from "../lib/simulations/policy-simulation-service";

const svc = new PolicySimulationService();

const input = {
  tenantId: "t1", simulationName: "integrity", connectorType: "m365", simulationScope: "RECOMMENDATION" as const, scopeEntityIds: ["r1"],
  projectedMonthlySavings: 500, projectedAffectedUsers: 5, projectedAffectedGroups: 1, projectedAffectedLicenses: 5,
  privilegedEntities: 0, unresolvedBlockers: 0, lowOrQuarantinedTrustEntities: 0, staleEvidenceEntities: 0,
  actionType: "REMOVE_LICENSE", entitlementType: "E1", connectorReliabilityScore: 92, policyExceptionCount: 0, governanceSensitivityScore: 18,
  forecastInput: { historicalRealizationRate: 0.97, historicalDriftRate: 0.03, historicalReversalRate: 0.01, projectedVsRealizedDeltaPercent: 5, confidenceCalibratedRate: 0.9 },
};

test("hashes stable and replay integrity validates", () => {
  const a = svc.simulate(input);
  const b = svc.simulate(input);
  assert.equal(a.deterministicHash, b.deterministicHash);
  assert.equal(svc.validateIntegrity(a as any), true);
  assert.equal(svc.validateIntegrity({ ...(a as any), projectedMonthlySavings: 501 }), false);
});

test("simulations are immutable snapshots (new run can persist separately)", () => {
  const a = svc.simulate(input);
  const c = svc.simulate({ ...input, simulationName: "integrity-2" });
  assert.notEqual(a.deterministicHash, c.deterministicHash);
});
