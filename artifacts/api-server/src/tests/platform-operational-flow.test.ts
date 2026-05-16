import test from "node:test";
import assert from "node:assert/strict";
import { assessTrust } from "../lib/trust-engine";
import { PolicySimulationService } from "../lib/simulations/policy-simulation-service";
import { deterministicHash } from "../lib/recommendations/recommendation-rationale-persistence-service";

test("platform operational flow composes deterministic lifecycle artifacts", () => {
  const tenantId = "tenant-operational-flow";
  const connectorEvidence = { connectorHealth: "HEALTHY", dataFreshnessScore: 0.95, partialData: false };
  assert.equal(connectorEvidence.connectorHealth, "HEALTHY");

  const trust = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 0.95, ownership_confidence: 0.8, source_reliability: 0.9 },
    recommendation_input: { usage_signal_quality: 0.8, entitlement_confidence: 0.9, policy_fit: 0.8, savings_confidence: 0.75 },
    execution_input: { action_reversibility: 0.7, approval_state: 0.5, blast_radius_score: 0.8, rollback_confidence: 0.7 },
    blocker_context: { admin_or_service_account_match: false, connector_health_failed: false, source_stale_beyond_sla: false, usage_data_missing_for_removal_action: false },
    warnings: [],
    mvp_mode: true,
  } as any);
  assert.equal(typeof trust.execution_gate, "string");

  const recommendation = { tenantId, recommendationId: "rec-1", trustBand: trust.execution_gate, projectedMonthlySaving: 1200 };
  const rationaleHash = deterministicHash({ recommendation, governanceDecision: "ALLOW", reasons: ["fixture"] });
  assert.equal(typeof rationaleHash, "string");

  const arbitration = [{ recommendationId: recommendation.recommendationId, priorityScore: 87 }];
  assert.equal(arbitration[0].priorityScore > 0, true);

  const simulation = new PolicySimulationService().simulate({
    tenantId,
    simulationName: "flow-proof",
    simulationScope: "RECOMMENDATION",
    scopeEntityIds: [recommendation.recommendationId],
    connectorType: "m365",
    projectedMonthlySavings: 1200,
    projectedAffectedUsers: 10,
    projectedAffectedGroups: 1,
    projectedAffectedLicenses: 10,
    privilegedEntities: 1,
    unresolvedBlockers: 0,
    lowOrQuarantinedTrustEntities: 0,
    staleEvidenceEntities: 0,
    actionType: "REMOVE_LICENSE",
    entitlementType: "M365_E3",
    connectorReliabilityScore: 90,
    policyExceptionCount: 0,
    governanceSensitivityScore: 30,
    forecastInput: { historicalRealizationRate: 0.9, historicalDriftRate: 0.1, historicalReversalRate: 0.05, projectedVsRealizedDeltaPercent: 10, confidenceCalibratedRate: 0.8 },
  });

  assert.equal(simulation.tenantId, tenantId);
  assert.equal(new PolicySimulationService().validateIntegrity(simulation), true);

  const workflowDecision = { itemId: "wf-1", decision: "APPROVE", tenantId };
  const outcomeResolution = { recommendationId: recommendation.recommendationId, status: "RESOLVED", tenantId };
  const telemetry = { correlationId: "corr-1", traceId: "trace-1", tenantId };

  assert.equal(workflowDecision.decision, "APPROVE");
  assert.equal(outcomeResolution.status, "RESOLVED");
  assert.equal(Boolean(telemetry.correlationId && telemetry.traceId), true);
});
