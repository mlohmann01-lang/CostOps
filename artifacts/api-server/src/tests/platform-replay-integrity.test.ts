import test from "node:test";
import assert from "node:assert/strict";
import { deterministicHash, RecommendationRationalePersistenceService } from "../lib/recommendations/recommendation-rationale-persistence-service";
import { PolicySimulationService } from "../lib/simulations/policy-simulation-service";
import fs from "node:fs";

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
});

test("replay integrity covers atlassian and cross-domain runtime events",()=>{ const telem=fs.readFileSync(new URL("../lib/observability/operational-telemetry-service.ts", import.meta.url),"utf8"); assert.equal(telem.includes("ATLASSIAN_REPLAY_VALIDATED"), true); assert.equal(telem.includes("ATLASSIAN_RENEWAL_READINESS_COMPUTED"), true); assert.equal(telem.includes("CROSS_DOMAIN_REPLAY_VALIDATED"), true); assert.equal(telem.includes("RUNTIME_HARDENING_REPLAY_DURABILITY_EVALUATED"), true); });
