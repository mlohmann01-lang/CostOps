import test from "node:test";
import assert from "node:assert/strict";
import { RecommendationGovernanceEventRepository } from "../lib/recommendations/governance-event-repository";

test("test memory mode works", async () => {
  process.env.RUNTIME_ENV = "test";
  const repo = new RecommendationGovernanceEventRepository({ storageMode: "memory" });
  await repo.append({ tenantId: "t", recommendationId: "r", eventType: "RECOMMENDATION_BLOCKED", actorId: "a", actorRole: "OPERATOR", eventReason: "x", beforeState: "A", afterState: "B", beforeReadiness: "A", afterReadiness: "B", evidenceSnapshot: [], approvalSnapshot: {}, blockedReasonsSnapshot: ["x"], readinessReasonsSnapshot: [] });
  const rows = await repo.list("t", "r");
  assert.equal(rows.length, 1);
});

test("production cannot use memory mode", () => {
  process.env.RUNTIME_ENV = "production";
  assert.throws(() => new RecommendationGovernanceEventRepository({ storageMode: "memory" }), /FAIL_CLOSED/);
});
