import test from "node:test";
import assert from "node:assert/strict";
import { deterministicHash, RecommendationRationalePersistenceService } from "../lib/recommendations/recommendation-rationale-persistence-service";
import { PolicySimulationService } from "../lib/simulations/policy-simulation-service";

test("platform replay integrity: stable hashes and trace fields", () => {
  const rationalePayload = { recommendationId: "rec-1", reasons: ["A", "B"], trust: 0.88 };
  const h1 = deterministicHash(rationalePayload);
  const h2 = deterministicHash({ trust: 0.88, reasons: ["A", "B"], recommendationId: "rec-1" });
  assert.equal(h1, h2);

  const rationaleService = new RecommendationRationalePersistenceService();
  assert.equal(rationaleService.validateRecommendationReplayIntegrity({ ...rationalePayload, deterministicHash: h1 } as any), "VALID");

  const simulation = new PolicySimulationService().simulate({
    tenantId: "tenant-r", simulationName: "sim", simulationScope: "TENANT", scopeEntityIds: [], connectorType: "m365", projectedMonthlySavings: 10, projectedAffectedUsers: 1, projectedAffectedGroups: 1, projectedAffectedLicenses: 1, privilegedEntities: 0, unresolvedBlockers: 0, lowOrQuarantinedTrustEntities: 0, staleEvidenceEntities: 0, actionType: "REMOVE_LICENSE", entitlementType: "M365_E3", connectorReliabilityScore: 99, policyExceptionCount: 0, governanceSensitivityScore: 20,
    forecastInput: { historicalRealizationRate: 0.95, historicalDriftRate: 0.05, historicalReversalRate: 0.03, projectedVsRealizedDeltaPercent: 5, confidenceCalibratedRate: 0.9 },
  });
  assert.equal(new PolicySimulationService().validateIntegrity(simulation), true);

  const governanceEvaluation = { recommendationId: "rec-1", policyDecision: "ALLOW", reasons: ["fixture"] };
  const decisionTrace = { recommendationId: "rec-1", decision: "APPROVE", reviewer: "ops-user" };
  const outcome = { recommendationId: "rec-1", status: "RESOLVED", proof: "hash-proof" };
  const trace = { correlationId: "corr-x", traceId: "trace-x" };

  assert.equal(deterministicHash(governanceEvaluation), deterministicHash(governanceEvaluation));
  assert.equal(deterministicHash(outcome), deterministicHash(outcome));
  assert.equal(decisionTrace.decision, "APPROVE");
  assert.equal(Boolean(trace.correlationId && trace.traceId), true);
});
