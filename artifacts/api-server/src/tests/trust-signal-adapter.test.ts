import test from "node:test";
import assert from "node:assert/strict";
import { mapTrustSignalsFromFindings } from "../lib/reconciliation/trust-signal-mapper.js";

test("identity conflict maps to BLOCK", () => {
  const out = mapTrustSignalsFromFindings([{ findingType: "IDENTITY_CONFLICT" }]);
  assert.equal(out.recommendedTrustImpact, "BLOCK");
});

test("entitlement conflict maps to DOWNGRADE or BLOCK", () => {
  const out = mapTrustSignalsFromFindings([{ findingType: "ENTITLEMENT_CONFLICT" }]);
  assert.ok(out.recommendedTrustImpact === "DOWNGRADE" || out.recommendedTrustImpact === "BLOCK");
});

test("ownership missing maps to WARNING", () => {
  const out = mapTrustSignalsFromFindings([{ findingType: "OWNERSHIP_MISSING" }]);
  assert.equal(out.recommendedTrustImpact, "WARNING");
});


import { assessTrust } from "../lib/trust-engine.js";

test("BLOCK signal creates blocker and BLOCKED gate", () => {
  const out = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 1, ownership_confidence: 1, source_reliability: 1 },
    recommendation_input: { usage_signal_quality: 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: 1 },
    execution_input: { action_reversibility: 1, approval_state: 1, blast_radius_score: 1, rollback_confidence: 1 },
    blocker_context: {},
    reconciliationTrustSignals: { recommendedTrustImpact: "BLOCK" },
    mvp_mode: true,
  });
  assert.ok(out.critical_blockers.includes("RECONCILIATION_CONFLICT_BLOCK"));
  assert.equal(out.execution_gate, "BLOCKED");
});

test("DOWNGRADE signal lowers recommendationTrustScore and adds warning", () => {
  const base = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 1, ownership_confidence: 1, source_reliability: 1 },
    recommendation_input: { usage_signal_quality: 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: 1 },
    execution_input: { action_reversibility: 1, approval_state: 1, blast_radius_score: 1, rollback_confidence: 1 },
    blocker_context: {},
    mvp_mode: true,
  });
  const out = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 1, ownership_confidence: 1, source_reliability: 1 },
    recommendation_input: { usage_signal_quality: 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: 1 },
    execution_input: { action_reversibility: 1, approval_state: 1, blast_radius_score: 1, rollback_confidence: 1 },
    blocker_context: {},
    reconciliationTrustSignals: { recommendedTrustImpact: "DOWNGRADE" },
    mvp_mode: true,
  });
  assert.ok(out.recommendation_trust_score < base.recommendation_trust_score);
  assert.ok(out.warnings.includes("RECONCILIATION_CONFLICT_DOWNGRADE"));
});

test("WARNING signal adds warning only", () => {
  const out = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 1, ownership_confidence: 1, source_reliability: 1 },
    recommendation_input: { usage_signal_quality: 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: 1 },
    execution_input: { action_reversibility: 1, approval_state: 1, blast_radius_score: 1, rollback_confidence: 1 },
    blocker_context: {},
    reconciliationTrustSignals: { recommendedTrustImpact: "WARNING" },
    mvp_mode: true,
  });
  assert.ok(out.warnings.includes("RECONCILIATION_WARNING"));
  assert.equal(out.critical_blockers.includes("RECONCILIATION_CONFLICT_BLOCK"), false);
});

test("No signals preserves current behavior", () => {
  const out = assessTrust({
    entity_input: { identity_confidence: 1, source_consistency: 1, data_freshness: 1, ownership_confidence: 1, source_reliability: 1 },
    recommendation_input: { usage_signal_quality: 1, entitlement_confidence: 1, policy_fit: 1, savings_confidence: 1 },
    execution_input: { action_reversibility: 1, approval_state: 1, blast_radius_score: 1, rollback_confidence: 1 },
    blocker_context: {},
    mvp_mode: true,
  });
  assert.equal(out.warnings.includes("RECONCILIATION_WARNING"), false);
  assert.equal(out.critical_blockers.includes("RECONCILIATION_CONFLICT_BLOCK"), false);
});

test("Positive signals do not increase score in V1", () => {
  const base = assessTrust({
    entity_input: { identity_confidence: 0.9, source_consistency: 0.9, data_freshness: 0.9, ownership_confidence: 0.9, source_reliability: 0.9 },
    recommendation_input: { usage_signal_quality: 0.9, entitlement_confidence: 0.9, policy_fit: 0.9, savings_confidence: 0.9 },
    execution_input: { action_reversibility: 0.9, approval_state: 0.9, blast_radius_score: 0.9, rollback_confidence: 0.9 },
    blocker_context: {},
    mvp_mode: true,
  });
  const out = assessTrust({
    entity_input: { identity_confidence: 0.9, source_consistency: 0.9, data_freshness: 0.9, ownership_confidence: 0.9, source_reliability: 0.9 },
    recommendation_input: { usage_signal_quality: 0.9, entitlement_confidence: 0.9, policy_fit: 0.9, savings_confidence: 0.9 },
    execution_input: { action_reversibility: 0.9, approval_state: 0.9, blast_radius_score: 0.9, rollback_confidence: 0.9 },
    blocker_context: {},
    reconciliationTrustSignals: { identitySignals: [{ findingType: "IDENTITY_MATCH_CONFIRMED" }], entitlementSignals: [{ findingType: "ENTITLEMENT_MATCH" }], recommendedTrustImpact: "NONE" },
    mvp_mode: true,
  });
  assert.equal(out.recommendation_trust_score, base.recommendation_trust_score);
});
