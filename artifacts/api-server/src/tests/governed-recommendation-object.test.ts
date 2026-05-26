import test from "node:test";
import assert from "node:assert/strict";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";
import type { GovernedRecommendationInput } from "../lib/recommendations/types";

const base = (): GovernedRecommendationInput => ({
  recommendationId: "rec-1",
  tenantId: "t-1",
  playbookId: "pb-1",
  targetEntityId: "u-1",
  targetEntityType: "User",
  graphNodeIds: ["n-1"],
  graphEdgeIds: ["e-1"],
  discoveryLifecycleState: "TRUSTED",
  confidenceScore: 0.95,
  reliabilityBand: "HIGH",
  projectedMonthlySavings: 100,
  projectedAnnualSavings: 1200,
  savingsConfidence: "HIGH",
  actionType: "DISABLE_LICENSE",
  actionRiskClass: "A",
  evidencePointers: ["ev-1"],
});

test("trusted low-risk recommendation becomes execution ready", () => {
  const rec = buildGovernedRecommendation(base());
  assert.equal(rec.executionReadiness, "AUTO_EXECUTE_ELIGIBLE");
  assert.equal(rec.recommendationState, "EXECUTION_READY");
});

test("untrusted recommendation is blocked", () => {
  const rec = buildGovernedRecommendation({ ...base(), discoveryLifecycleState: "MATCHED" });
  assert.equal(rec.executionReadiness, "BLOCKED");
  assert.ok(rec.blockedReasons.includes("DISCOVERY_NOT_TRUSTED"));
});

test("missing evidence blocks execution", () => {
  const rec = buildGovernedRecommendation({ ...base(), evidencePointers: [] });
  assert.equal(rec.executionReadiness, "BLOCKED");
  assert.ok(rec.blockedReasons.includes("MISSING_EVIDENCE_POINTERS"));
});

test("high-risk action requires approval", () => {
  const rec = buildGovernedRecommendation({ ...base(), actionRiskClass: "C", hasApproval: false });
  assert.equal(rec.executionReadiness, "APPROVAL_REQUIRED");
  assert.ok(rec.requiredApprovals.includes("RISK_CLASS_C_OR_HIGHER"));
});

test("never-eligible action cannot auto-execute", () => {
  const rec = buildGovernedRecommendation({ ...base(), neverEligible: true });
  assert.equal(rec.executionReadiness, "NEVER_ELIGIBLE");
});

test("projected savings remain visible when blocked", () => {
  const rec = buildGovernedRecommendation({ ...base(), evidencePointers: [] });
  assert.equal(rec.projectedMonthlySavings, 100);
  assert.equal(rec.projectedAnnualSavings, 1200);
});

test("readiness reasons are explainable", () => {
  const rec = buildGovernedRecommendation({ ...base(), confidenceScore: 0.8 });
  assert.ok(rec.readinessReasons.includes("CONFIDENCE_BELOW_AUTO_EXECUTION_THRESHOLD"));
});
