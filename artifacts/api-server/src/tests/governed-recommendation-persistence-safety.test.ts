import test from "node:test";
import assert from "node:assert/strict";
import { GovernedRecommendationRepository } from "../lib/recommendations/recommendation-repository";
import { buildGovernedRecommendation } from "../lib/recommendations/recommendation-builder";

const mk = () => buildGovernedRecommendation({
  recommendationId: `rec-safety-${Date.now()}`,
  tenantId: "t-safety",
  playbookId: "pb",
  targetEntityId: "u1",
  targetEntityType: "User",
  graphNodeIds: ["n1"],
  graphEdgeIds: ["e1"],
  discoveryLifecycleState: "TRUSTED",
  confidenceScore: 0.95,
  reliabilityBand: "HIGH",
  projectedMonthlySavings: 10,
  projectedAnnualSavings: 120,
  savingsConfidence: "HIGH",
  actionType: "REMOVE_LICENSE",
  actionRiskClass: "B",
  evidencePointers: ["ev1"],
});

test("test/dev memory fallback still works", async () => {
  const prev = process.env.RUNTIME_ENV;
  process.env.RUNTIME_ENV = "test";
  const repo = new GovernedRecommendationRepository();
  const row = await repo.upsert("t-safety", mk(), ["src"]);
  assert.ok(row.recommendationId.startsWith("rec-safety-"));
  process.env.RUNTIME_ENV = prev;
});

test("production DB failure does not use memory fallback", async () => {
  const prev = process.env.RUNTIME_ENV;
  process.env.RUNTIME_ENV = "production";
  const repo = new GovernedRecommendationRepository();
  await assert.rejects(() => repo.upsert("t-safety", mk(), ["src"]), /FAIL_CLOSED/);
  process.env.RUNTIME_ENV = prev;
});
