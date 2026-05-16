import test from "node:test";
import assert from "node:assert/strict";
import { buildRecommendationExplainability } from "../lib/recommendations/recommendation-explainability";

test("buildRecommendationExplainability returns deterministic lineage payload", () => {
  const result = buildRecommendationExplainability({
    playbookId: "m365_inactive_user_reclaim",
    playbookName: "Inactive User Reclaim",
    matched: true,
    trustBand: "MEDIUM",
    findingsBlock: false,
    suppression: null,
    trust: {
      executionGate: "APPROVAL_REQUIRED",
      criticalBlockers: [],
      warnings: ["RECONCILIATION_WARNING"],
      entityTrustScore: 0.88,
      recommendationTrustScore: 0.84,
      executionReadinessScore: 0.81,
      savingsConfidence: 0.9,
    },
    evidence: { daysInactive: 120, hasLicense: true },
    trustGovernanceDecisions: [{ stage: "GOVERNANCE", decision: "RECOMMEND_ONLY", reason: "NO_EXECUTION_AUTHORITY" }],
  });

  assert.equal(result.whyExists, "PLAYBOOK_MATCH");
  assert.equal(result.safeStatus, "SAFE_WITH_GOVERNANCE");
  assert.deepEqual(result.evidenceContributors, ["daysInactive", "hasLicense"]);
  assert.equal(result.projectedSavingsConfidence.derivation, "recommendation_input.savings_confidence");
});
